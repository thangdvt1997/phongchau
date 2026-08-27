import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InventoryTxnType } from '@prisma/client';
import { MarketingAutomationService } from '../marketing/marketing-automation.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';

/**
 * Covers Inventory + InventoryTransaction. `getAvailableStock`, `reserveStock`
 * and `releaseStock` are the exported contract other modules (Cart, Orders)
 * depend on — keep their signatures stable.
 */
@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly marketingAutomation: MarketingAutomationService,
  ) {}

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

    const include = {
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
    } as const;

    const mapRow = (row: {
      id: string;
      productVariantId: string;
      warehouseId: string;
      quantityOnHand: number;
      quantityReserved: number;
      lowStockThreshold: number;
      updatedAt: Date;
      warehouse: { name: string };
      productVariant: {
        sku: string;
        product: { id: string; name: string; sku: string };
      };
    }) => {
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
    };

    if (!query.lowStockOnly) {
      // The common path: Prisma's `where` can express everything needed, so paginate at the
      // DB level like every other admin list endpoint — this used to fetch the ENTIRE
      // inventory table (every variant × every warehouse) on every single request regardless
      // of requested page size.
      const [rows, total] = await Promise.all([
        this.prisma.inventory.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include,
        }),
        this.prisma.inventory.count({ where }),
      ]);
      return { items: rows.map(mapRow), total, page, pageSize };
    }

    // lowStockOnly compares two columns of the same row (quantityOnHand - quantityReserved
    // <= lowStockThreshold), which Prisma's `where` can't express without a raw query.
    // Filtering in memory is still needed here, but the fetch itself is now bounded instead
    // of truly unbounded — low-stock rows are a small minority of the catalog in practice, so
    // this cap comfortably covers real usage while guaranteeing the request can't scale with
    // total inventory row count.
    const LOW_STOCK_SCAN_CAP = 5000;
    const rows = await this.prisma.inventory.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: LOW_STOCK_SCAN_CAP,
      include,
    });
    const filtered = rows.map(mapRow).filter((row) => row.isLowStock);
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
    if ((type === 'DAMAGE' || type === 'EXPIRE') && !reference) {
      throw new BadRequestException('reference is required for DAMAGE and EXPIRE adjustments');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
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
        // OUT, DAMAGE, EXPIRE all decrease stock on hand.
        quantityOnHand -= quantity;
        if (quantityOnHand < 0) {
          throw new BadRequestException('Adjustment would result in negative stock on hand');
        }
      }

      const updatedRow = await tx.inventory.update({
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

      return updatedRow;
    });

    if (type === 'IN' || type === 'ADJUST') {
      // Fire-and-forget: a notification hiccup must never break the inventory
      // adjustment that has already committed above. quantityReserved is
      // untouched by this method, so the total-available delta across all
      // warehouses equals exactly the `quantity` just added to this one.
      this.notifyBackInStockIfNeeded(productVariantId, quantity).catch(() => undefined);
    }

    return updated;
  }

  private async notifyBackInStockIfNeeded(productVariantId: string, quantityAdded: number): Promise<void> {
    const newAvailable = await this.getAvailableStock(productVariantId);
    const previousAvailable = newAvailable - quantityAdded;
    await this.marketingAutomation.notifyBackInStockIfNeeded(
      productVariantId,
      previousAvailable,
      newAvailable,
    );
  }
}
