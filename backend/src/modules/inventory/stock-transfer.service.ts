import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { generateCode } from '../../common/utils/code-generator.util';
import { InventoryTxnType, StockTransferStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { StockTransferQueryDto } from './dto/stock-transfer-query.dto';

const ACTIVE_STATUSES: StockTransferStatus[] = [StockTransferStatus.PENDING, StockTransferStatus.IN_TRANSIT];

// Shape produced by the `include` used in list()/findOne() — narrow local type so
// serialize() doesn't need `any`.
interface StockTransferRow {
  id: string;
  transferNumber: string;
  productVariantId: string;
  productVariant: { sku: string };
  fromWarehouseId: string;
  fromWarehouse: { name: string };
  toWarehouseId: string;
  toWarehouse: { name: string };
  quantity: number;
  status: StockTransferStatus;
  note: string | null;
  createdBy: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

/** Covers StockTransfer — moving stock between warehouses in two steps: create (intent only,
 * no stock moved) then complete (atomically moves stock and logs TRANSFER_OUT/TRANSFER_IN). */
@Injectable()
export class StockTransferService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStockTransferDto, createdBy?: string) {
    const { productVariantId, fromWarehouseId, toWarehouseId, quantity, note } = dto;

    if (fromWarehouseId === toWarehouseId) {
      throw new BadRequestException('fromWarehouseId and toWarehouseId must be different');
    }

    const [variant, fromWarehouse, toWarehouse] = await Promise.all([
      this.prisma.productVariant.findUnique({ where: { id: productVariantId } }),
      this.prisma.warehouse.findUnique({ where: { id: fromWarehouseId } }),
      this.prisma.warehouse.findUnique({ where: { id: toWarehouseId } }),
    ]);
    if (!variant) {
      throw new NotFoundException(`productVariantId ${productVariantId} does not reference an existing variant`);
    }
    if (!fromWarehouse) {
      throw new NotFoundException(`fromWarehouseId ${fromWarehouseId} does not reference an existing warehouse`);
    }
    if (!toWarehouse) {
      throw new NotFoundException(`toWarehouseId ${toWarehouseId} does not reference an existing warehouse`);
    }

    const fromInventory = await this.prisma.inventory.findFirst({
      where: { productVariantId, warehouseId: fromWarehouseId, batchId: null },
    });
    const available = fromInventory ? fromInventory.quantityOnHand - fromInventory.quantityReserved : 0;
    if (available < quantity) {
      throw new BadRequestException('Insufficient available stock in the source warehouse to create this transfer');
    }

    const transferNumber = generateCode('TRF', 6);

    return this.prisma.stockTransfer.create({
      data: {
        transferNumber,
        productVariantId,
        fromWarehouseId,
        toWarehouseId,
        quantity,
        note,
        createdBy,
        status: StockTransferStatus.PENDING,
      },
    });
  }

  async list(query: StockTransferQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);

    const where: {
      productVariantId?: string;
      status?: StockTransferStatus;
      OR?: Array<{ fromWarehouseId?: string; toWarehouseId?: string }>;
    } = {};
    if (query.productVariantId) where.productVariantId = query.productVariantId;
    if (query.status) where.status = query.status;
    if (query.warehouseId) {
      where.OR = [{ fromWarehouseId: query.warehouseId }, { toWarehouseId: query.warehouseId }];
    }

    const [rows, total] = await Promise.all([
      this.prisma.stockTransfer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          productVariant: { select: { id: true, sku: true } },
          fromWarehouse: { select: { id: true, name: true, code: true } },
          toWarehouse: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.stockTransfer.count({ where }),
    ]);

    return { items: rows.map((row) => this.serialize(row)), total, page, pageSize };
  }

  async findOne(id: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        productVariant: { select: { id: true, sku: true } },
        fromWarehouse: { select: { id: true, name: true, code: true } },
        toWarehouse: { select: { id: true, name: true, code: true } },
      },
    });
    if (!transfer) throw new NotFoundException('Stock transfer not found');
    return this.serialize(transfer);
  }

  async markInTransit(id: string) {
    const transfer = await this.findOrThrow(id);
    if (transfer.status !== StockTransferStatus.PENDING) {
      throw new BadRequestException('Only a PENDING transfer can be marked in-transit');
    }
    return this.prisma.stockTransfer.update({
      where: { id },
      data: { status: StockTransferStatus.IN_TRANSIT },
    });
  }

  async cancel(id: string) {
    const transfer = await this.findOrThrow(id);
    if (!ACTIVE_STATUSES.includes(transfer.status)) {
      throw new BadRequestException('Only a PENDING or IN_TRANSIT transfer can be cancelled');
    }
    return this.prisma.stockTransfer.update({
      where: { id },
      data: { status: StockTransferStatus.CANCELLED },
    });
  }

  /** Atomically moves stock from -> to, logs TRANSFER_OUT/TRANSFER_IN, and marks COMPLETED.
   * Re-validates available stock at completion time since it may have changed since create(). */
  async complete(id: string) {
    const transfer = await this.findOrThrow(id);
    if (!ACTIVE_STATUSES.includes(transfer.status)) {
      throw new BadRequestException('Only a PENDING or IN_TRANSIT transfer can be completed');
    }

    return this.prisma.$transaction(async (tx) => {
      const fromInventory = await tx.inventory.findFirst({
        where: { productVariantId: transfer.productVariantId, warehouseId: transfer.fromWarehouseId, batchId: null },
      });
      const available = fromInventory ? fromInventory.quantityOnHand - fromInventory.quantityReserved : 0;
      if (!fromInventory || available < transfer.quantity) {
        throw new BadRequestException(
          'Insufficient available stock in the source warehouse to complete this transfer',
        );
      }

      await tx.inventory.update({
        where: { id: fromInventory.id },
        data: { quantityOnHand: fromInventory.quantityOnHand - transfer.quantity },
      });
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: fromInventory.id,
          type: InventoryTxnType.TRANSFER_OUT,
          quantity: transfer.quantity,
          reference: transfer.transferNumber,
        },
      });

      let toInventory = await tx.inventory.findFirst({
        where: { productVariantId: transfer.productVariantId, warehouseId: transfer.toWarehouseId, batchId: null },
      });
      if (!toInventory) {
        toInventory = await tx.inventory.create({
          data: {
            productVariantId: transfer.productVariantId,
            warehouseId: transfer.toWarehouseId,
            quantityOnHand: 0,
            quantityReserved: 0,
          },
        });
      }
      await tx.inventory.update({
        where: { id: toInventory.id },
        data: { quantityOnHand: toInventory.quantityOnHand + transfer.quantity },
      });
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: toInventory.id,
          type: InventoryTxnType.TRANSFER_IN,
          quantity: transfer.quantity,
          reference: transfer.transferNumber,
        },
      });

      return tx.stockTransfer.update({
        where: { id },
        data: { status: StockTransferStatus.COMPLETED, completedAt: new Date() },
      });
    });
  }

  private async findOrThrow(id: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({ where: { id } });
    if (!transfer) throw new NotFoundException('Stock transfer not found');
    return transfer;
  }

  private serialize(row: StockTransferRow) {
    return {
      id: row.id,
      transferNumber: row.transferNumber,
      productVariantId: row.productVariantId,
      variantSku: row.productVariant.sku,
      fromWarehouseId: row.fromWarehouseId,
      fromWarehouseName: row.fromWarehouse.name,
      toWarehouseId: row.toWarehouseId,
      toWarehouseName: row.toWarehouse.name,
      quantity: row.quantity,
      status: row.status,
      note: row.note,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    };
  }
}
