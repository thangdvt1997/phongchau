import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InventoryTxnType } from '@prisma/client';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';

/**
 * Covers Inventory + InventoryTransaction. `getAvailableStock`, `reserveStock`
 * and `releaseStock` are the exported contract other modules (Cart, Orders)
 * depend on — keep their signatures stable.
 */
@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Sum across all warehouses of (quantityOnHand - quantityReserved). */
  async getAvailableStock(productVariantId: string): Promise<number> {
    const rows = await this.prisma.inventory.findMany({
      where: { productVariantId },
      select: { quantityOnHand: true, quantityReserved: true },
    });
    return rows.reduce((sum, row) => sum + (row.quantityOnHand - row.quantityReserved), 0);
  }

  /**
   * Reserves `quantity` units across any warehouse(s) with available stock.
   * Throws BadRequestException if total available stock is insufficient.
   */
  async reserveStock(productVariantId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive integer');
    }

    const rows = await this.prisma.inventory.findMany({
      where: { productVariantId },
      orderBy: { updatedAt: 'asc' },
    });
    const totalAvailable = rows.reduce((sum, row) => sum + (row.quantityOnHand - row.quantityReserved), 0);
    if (totalAvailable < quantity) {
      throw new BadRequestException('Insufficient available stock to reserve');
    }

    await this.prisma.$transaction(async (tx) => {
      let remaining = quantity;
      for (const row of rows) {
        if (remaining <= 0) break;
        const available = row.quantityOnHand - row.quantityReserved;
        if (available <= 0) continue;
        const take = Math.min(available, remaining);

        // eslint-disable-next-line no-await-in-loop
        await tx.inventory.update({
          where: { id: row.id },
          data: { quantityReserved: { increment: take } },
        });
        // eslint-disable-next-line no-await-in-loop
        await tx.inventoryTransaction.create({
          data: { inventoryId: row.id, type: InventoryTxnType.RESERVE, quantity: take },
        });
        remaining -= take;
      }
    });
  }

  /** Releases up to `quantity` units of previously reserved stock (never below 0). */
  async releaseStock(productVariantId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive integer');
    }

    const rows = await this.prisma.inventory.findMany({
      where: { productVariantId, quantityReserved: { gt: 0 } },
      orderBy: { updatedAt: 'asc' },
    });

    await this.prisma.$transaction(async (tx) => {
      let remaining = quantity;
      for (const row of rows) {
        if (remaining <= 0) break;
        const release = Math.min(row.quantityReserved, remaining);
        if (release <= 0) continue;

        // eslint-disable-next-line no-await-in-loop
        await tx.inventory.update({
          where: { id: row.id },
          data: { quantityReserved: { decrement: release } },
        });
        // eslint-disable-next-line no-await-in-loop
        await tx.inventoryTransaction.create({
          data: { inventoryId: row.id, type: InventoryTxnType.RELEASE, quantity: release },
        });
        remaining -= release;
      }
    });
  }

  // ---------- Admin ----------

  async adminList(query: InventoryQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);

    const where: { warehouseId?: string; productVariantId?: string } = {};
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.productVariantId) where.productVariantId = query.productVariantId;

    const rows = await this.prisma.inventory.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        productVariant: {
          select: {
            id: true,
            sku: true,
            weightLabel: true,
            packagingLabel: true,
            product: { select: { id: true, name: true, sku: true, slug: true } },
          },
        },
      },
    });

    const mapped = rows.map((row) => {
      const available = row.quantityOnHand - row.quantityReserved;
      return {
        id: row.id,
        productVariantId: row.productVariantId,
        variantSku: row.productVariant.sku,
        productId: row.productVariant.product.id,
        productName: row.productVariant.product.name,
        productSku: row.productVariant.product.sku,
        warehouseId: row.warehouseId,
        warehouseName: row.warehouse.name,
        quantityOnHand: row.quantityOnHand,
        quantityReserved: row.quantityReserved,
        available,
        lowStockThreshold: row.lowStockThreshold,
        isLowStock: available <= row.lowStockThreshold,
        updatedAt: row.updatedAt,
      };
    });

    // NOTE: lowStockOnly compares two columns of the same row, which Prisma's
    // `where` filter can't express directly (no column-to-column comparisons).
    // Filtering + paginating in memory is fine at P0 scale; a raw SQL query
    // would be needed if the inventory table grows large.
    const filtered = query.lowStockOnly ? mapped.filter((row) => row.isLowStock) : mapped;
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return { items, total, page, pageSize };
  }

  async adjust(dto: AdjustInventoryDto) {
    const { productVariantId, warehouseId, quantity, type, reference } = dto;

    const [variant, warehouse] = await Promise.all([
      this.prisma.productVariant.findUnique({ where: { id: productVariantId } }),
      this.prisma.warehouse.findUnique({ where: { id: warehouseId } }),
    ]);
    if (!variant) {
      throw new BadRequestException(`productVariantId ${productVariantId} does not reference an existing variant`);
    }
    if (!warehouse) {
      throw new BadRequestException(`warehouseId ${warehouseId} does not reference an existing warehouse`);
    }

    return this.prisma.$transaction(async (tx) => {
      let inventory = await tx.inventory.findFirst({
        where: { productVariantId, warehouseId, batchId: null },
      });
      if (!inventory) {
        inventory = await tx.inventory.create({
          data: { productVariantId, warehouseId, quantityOnHand: 0, quantityReserved: 0 },
        });
      }

      let quantityOnHand = inventory.quantityOnHand;
      if (type === 'IN' || type === 'ADJUST') {
        quantityOnHand += quantity;
      } else {
        quantityOnHand -= quantity;
        if (quantityOnHand < 0) {
          throw new BadRequestException('Adjustment would result in negative stock on hand');
        }
      }

      const updated = await tx.inventory.update({
        where: { id: inventory.id },
        data: { quantityOnHand },
      });

      await tx.inventoryTransaction.create({
        data: {
          inventoryId: inventory.id,
          type: type as InventoryTxnType,
          quantity,
          reference,
        },
      });

      return updated;
    });
  }
}
