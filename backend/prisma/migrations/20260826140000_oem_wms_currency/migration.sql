-- CreateEnum
CREATE TYPE "StockTransferStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CycleCountStatus" AS ENUM ('OPEN', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OemRequestStatus" AS ENUM ('REQUEST', 'REVIEW', 'SAMPLE', 'PRICING', 'APPROVAL', 'PRODUCTION', 'QC', 'DELIVERY', 'REJECTED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InventoryTxnType" ADD VALUE 'TRANSFER_OUT';
ALTER TYPE "InventoryTxnType" ADD VALUE 'TRANSFER_IN';
ALTER TYPE "InventoryTxnType" ADD VALUE 'DAMAGE';
ALTER TYPE "InventoryTxnType" ADD VALUE 'EXPIRE';
ALTER TYPE "InventoryTxnType" ADD VALUE 'CYCLE_COUNT';

-- AlterTable
ALTER TABLE "oem_requests" ADD COLUMN     "assignedSalesId" TEXT,
ADD COLUMN     "attachmentUrl" TEXT,
ADD COLUMN     "certificationRequirement" TEXT,
ADD COLUMN     "internalNote" TEXT,
ADD COLUMN     "isPrivateLabel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "packageSize" TEXT,
ADD COLUMN     "recipe" TEXT,
ADD COLUMN     "requestNumber" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "OemRequestStatus" NOT NULL DEFAULT 'REQUEST';

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "fromWarehouseId" TEXT NOT NULL,
    "toWarehouseId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "StockTransferStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycle_counts" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "expectedQuantity" INTEGER NOT NULL,
    "actualQuantity" INTEGER,
    "discrepancy" INTEGER,
    "status" "CycleCountStatus" NOT NULL DEFAULT 'OPEN',
    "note" TEXT,
    "countedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "cycle_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oem_messages" (
    "id" TEXT NOT NULL,
    "oemRequestId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oem_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'VND',
    "targetCurrency" TEXT NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfers_transferNumber_key" ON "stock_transfers"("transferNumber");

-- CreateIndex
CREATE INDEX "stock_transfers_productVariantId_idx" ON "stock_transfers"("productVariantId");

-- CreateIndex
CREATE INDEX "stock_transfers_fromWarehouseId_idx" ON "stock_transfers"("fromWarehouseId");

-- CreateIndex
CREATE INDEX "stock_transfers_toWarehouseId_idx" ON "stock_transfers"("toWarehouseId");

-- CreateIndex
CREATE INDEX "cycle_counts_warehouseId_idx" ON "cycle_counts"("warehouseId");

-- CreateIndex
CREATE INDEX "cycle_counts_productVariantId_idx" ON "cycle_counts"("productVariantId");

-- CreateIndex
CREATE INDEX "oem_messages_oemRequestId_idx" ON "oem_messages"("oemRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_targetCurrency_key" ON "exchange_rates"("targetCurrency");

-- CreateIndex
CREATE UNIQUE INDEX "oem_requests_requestNumber_key" ON "oem_requests"("requestNumber");

-- CreateIndex
CREATE INDEX "oem_requests_userId_idx" ON "oem_requests"("userId");

-- CreateIndex
CREATE INDEX "oem_requests_companyId_idx" ON "oem_requests"("companyId");

-- CreateIndex
CREATE INDEX "oem_requests_status_idx" ON "oem_requests"("status");

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oem_requests" ADD CONSTRAINT "oem_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oem_requests" ADD CONSTRAINT "oem_requests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oem_messages" ADD CONSTRAINT "oem_messages_oemRequestId_fkey" FOREIGN KEY ("oemRequestId") REFERENCES "oem_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oem_messages" ADD CONSTRAINT "oem_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

