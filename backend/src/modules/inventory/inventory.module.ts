import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { WarehousesController } from './warehouses.controller';
import { StockTransferController } from './stock-transfer.controller';
import { CycleCountController } from './cycle-count.controller';
import { InventoryService } from './inventory.service';
import { WarehousesService } from './warehouses.service';
import { StockTransferService } from './stock-transfer.service';
import { CycleCountService } from './cycle-count.service';

@Module({
  controllers: [InventoryController, WarehousesController, StockTransferController, CycleCountController],
  providers: [InventoryService, WarehousesService, StockTransferService, CycleCountService],
  exports: [InventoryService],
})
export class InventoryModule {}
