import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CycleCountStatus, InventoryTxnType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StartCycleCountDto } from './dto/start-cycle-count.dto';
import { CompleteCycleCountDto } from './dto/complete-cycle-count.dto';
import { CycleCountQueryDto } from './dto/cycle-count-query.dto';

/** Covers CycleCount — snapshot the expected quantity, record what was physically
 * counted, and reconcile Inventory.quantityOnHand to the counted value on completion. */
@Injectable()
export class CycleCountService {
  constructor(private readonly prisma: PrismaService) {}

  async start(dto: StartCycleCountDto) {
    const { warehouseId, productVariantId, note } = dto;

    const [warehouse, variant] = await Promise.all([
      this.prisma.warehouse.findUnique({ where: { id: warehouseId } }),
      this.prisma.productVariant.findUnique({ where: { id: productVariantId } }),
    ]);
    if (!warehouse) {
      throw new NotFoundException(`warehouseId ${warehouseId} does not reference an existing warehouse`);
    }
    if (!variant) {
      throw new NotFoundException(`productVariantId ${productVariantId} does not reference an existing variant`);
    }

    const inventory = await this.prisma.inventory.findFirst({
      where: { productVariantId, warehouseId, batchId: null },
    });
    const expectedQuantity = inventory?.quantityOnHand ?? 0;

    return this.prisma.cycleCount.create({
      data: {
        warehouseId,
        productVariantId,
        expectedQuantity,
        note,
        status: CycleCountStatus.OPEN,
      },
    });
  }

  async complete(id: string, dto: CompleteCycleCountDto, countedBy?: string) {
    const cycleCount = await this.prisma.cycleCount.findUnique({ where: { id } });
    if (!cycleCount) throw new NotFoundException('Cycle count not found');
    if (cycleCount.status !== CycleCountStatus.OPEN) {
      throw new BadRequestException('Only an OPEN cycle count can be completed');
    }

    const { actualQuantity } = dto;
    const discrepancy = actualQuantity - cycleCount.expectedQuantity;

    return this.prisma.$transaction(async (tx) => {
      if (discrepancy !== 0) {
        let inventory = await tx.inventory.findFirst({
          where: { productVariantId: cycleCount.productVariantId, warehouseId: cycleCount.warehouseId, batchId: null },
        });
        if (!inventory) {
          inventory = await tx.inventory.create({
            data: {
              productVariantId: cycleCount.productVariantId,
              warehouseId: cycleCount.warehouseId,
              quantityOnHand: 0,
              quantityReserved: 0,
            },
          });
        }
        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantityOnHand: actualQuantity },
        });
        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inventory.id,
            type: InventoryTxnType.CYCLE_COUNT,
            quantity: discrepancy,
            reference: cycleCount.id,
          },
        });
      }

      return tx.cycleCount.update({
        where: { id },
        data: {
          actualQuantity,
          discrepancy,
          status: CycleCountStatus.COMPLETED,
          completedAt: new Date(),
          countedBy,
        },
      });
    });
  }

  async list(query: CycleCountQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);

    const where: { warehouseId?: string; status?: CycleCountStatus } = {};
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.status) where.status = query.status;

    const [rows, total] = await Promise.all([
      this.prisma.cycleCount.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          productVariant: { select: { id: true, sku: true } },
        },
      }),
      this.prisma.cycleCount.count({ where }),
    ]);

    const items = rows.map((row) => ({
      id: row.id,
      warehouseId: row.warehouseId,
      warehouseName: row.warehouse.name,
      productVariantId: row.productVariantId,
      variantSku: row.productVariant.sku,
      expectedQuantity: row.expectedQuantity,
      actualQuantity: row.actualQuantity,
      discrepancy: row.discrepancy,
      status: row.status,
      note: row.note,
      countedBy: row.countedBy,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    }));

    return { items, total, page, pageSize };
  }
}
