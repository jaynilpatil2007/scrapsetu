-- CreateEnum
CREATE TYPE "Language" AS ENUM ('HI', 'MR', 'EN');

-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('DRAFT', 'READY', 'MATCHING', 'PICKUP_REQUESTED', 'HANDED_OVER', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuthorizationStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('CREATED', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('RECYCLER_QUOTE', 'COMPLETED_TRANSACTION', 'ADMIN_ENTRY', 'FIELD_RESEARCH');

-- CreateTable
CREATE TABLE "Collector" (
    "id" TEXT NOT NULL,
    "preferredLanguage" "Language" NOT NULL DEFAULT 'HI',
    "operatingArea" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "collectorId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "description" TEXT,
    "approxWeight" DOUBLE PRECISION NOT NULL,
    "condition" TEXT,
    "sourceType" TEXT,
    "aiCategory" TEXT,
    "aiSubcategory" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "aiModel" TEXT,
    "confirmedCategory" TEXT,
    "confirmedSubcategory" TEXT,
    "estimatedMinValue" DOUBLE PRECISION,
    "estimatedMaxValue" DOUBLE PRECISION,
    "collectionLatitude" DOUBLE PRECISION,
    "collectionLongitude" DOUBLE PRECISION,
    "collectionLocation" TEXT,
    "status" "LotStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LotImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recycler" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "facilityLatitude" DOUBLE PRECISION,
    "facilityLongitude" DOUBLE PRECISION,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "authorizationNumber" TEXT,
    "authorizationStatus" "AuthorizationStatus" NOT NULL DEFAULT 'PENDING',
    "authorizationExpiry" TIMESTAMP(3),
    "phone" TEXT,
    "email" TEXT,
    "pickupAvailable" BOOLEAN NOT NULL DEFAULT false,
    "serviceRadiusKm" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recycler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecyclerMaterial" (
    "id" TEXT NOT NULL,
    "recyclerId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "offeredRate" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "minQuantity" DOUBLE PRECISION,
    "pickupAvailable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RecyclerMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceRecord" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "recyclerId" TEXT,
    "location" TEXT,
    "city" TEXT,
    "state" TEXT,
    "buyingPrice" DOUBLE PRECISION NOT NULL,
    "sellingPrice" DOUBLE PRECISION,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "sourceType" "PriceSource" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceQuote" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "recyclerId" TEXT NOT NULL,
    "quotedPrice" DOUBLE PRECISION NOT NULL,
    "quotedTotal" DOUBLE PRECISION,
    "expiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "collectorId" TEXT NOT NULL,
    "recyclerId" TEXT NOT NULL,
    "quotedPrice" DOUBLE PRECISION,
    "finalPrice" DOUBLE PRECISION NOT NULL,
    "quotedWeight" DOUBLE PRECISION,
    "finalWeight" DOUBLE PRECISION,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "collectionLocation" TEXT,
    "handoverLocation" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "provider" TEXT,
    "providerPayoutId" TEXT,
    "destinationType" TEXT,
    "destinationRef" TEXT,
    "status" "PayoutStatus" NOT NULL DEFAULT 'CREATED',
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Handover" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "recyclerId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "photoUrl" TEXT,
    "handoverReference" TEXT NOT NULL,
    "verificationHash" TEXT NOT NULL,
    "collectorConfirmedAt" TIMESTAMP(3),
    "recyclerConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Handover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraceabilityEvent" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "metadata" JSONB,
    "previousHash" TEXT,
    "eventHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TraceabilityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Material_category_idx" ON "Material"("category");

-- CreateIndex
CREATE INDEX "Material_subcategory_idx" ON "Material"("subcategory");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_lotNumber_key" ON "Lot"("lotNumber");

-- CreateIndex
CREATE INDEX "Lot_collectorId_idx" ON "Lot"("collectorId");

-- CreateIndex
CREATE INDEX "Lot_materialId_idx" ON "Lot"("materialId");

-- CreateIndex
CREATE INDEX "Lot_status_idx" ON "Lot"("status");

-- CreateIndex
CREATE INDEX "Lot_createdAt_idx" ON "Lot"("createdAt");

-- CreateIndex
CREATE INDEX "LotImage_lotId_idx" ON "LotImage"("lotId");

-- CreateIndex
CREATE INDEX "Recycler_city_idx" ON "Recycler"("city");

-- CreateIndex
CREATE INDEX "Recycler_state_idx" ON "Recycler"("state");

-- CreateIndex
CREATE INDEX "Recycler_authorizationStatus_idx" ON "Recycler"("authorizationStatus");

-- CreateIndex
CREATE INDEX "RecyclerMaterial_materialId_idx" ON "RecyclerMaterial"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "RecyclerMaterial_recyclerId_materialId_key" ON "RecyclerMaterial"("recyclerId", "materialId");

-- CreateIndex
CREATE INDEX "PriceRecord_materialId_recordedAt_idx" ON "PriceRecord"("materialId", "recordedAt");

-- CreateIndex
CREATE INDEX "PriceRecord_city_materialId_idx" ON "PriceRecord"("city", "materialId");

-- CreateIndex
CREATE INDEX "PriceQuote_lotId_idx" ON "PriceQuote"("lotId");

-- CreateIndex
CREATE INDEX "PriceQuote_recyclerId_idx" ON "PriceQuote"("recyclerId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_transactionNumber_key" ON "Transaction"("transactionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_lotId_key" ON "Transaction"("lotId");

-- CreateIndex
CREATE INDEX "Transaction_collectorId_idx" ON "Transaction"("collectorId");

-- CreateIndex
CREATE INDEX "Transaction_recyclerId_idx" ON "Transaction"("recyclerId");

-- CreateIndex
CREATE INDEX "Transaction_paymentStatus_idx" ON "Transaction"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_transactionId_key" ON "Payout"("transactionId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Handover_lotId_key" ON "Handover"("lotId");

-- CreateIndex
CREATE UNIQUE INDEX "Handover_transactionId_key" ON "Handover"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Handover_handoverReference_key" ON "Handover"("handoverReference");

-- CreateIndex
CREATE INDEX "Handover_recyclerId_idx" ON "Handover"("recyclerId");

-- CreateIndex
CREATE INDEX "TraceabilityEvent_lotId_createdAt_idx" ON "TraceabilityEvent"("lotId", "createdAt");

-- CreateIndex
CREATE INDEX "TraceabilityEvent_eventType_idx" ON "TraceabilityEvent"("eventType");

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotImage" ADD CONSTRAINT "LotImage_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclerMaterial" ADD CONSTRAINT "RecyclerMaterial_recyclerId_fkey" FOREIGN KEY ("recyclerId") REFERENCES "Recycler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclerMaterial" ADD CONSTRAINT "RecyclerMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceRecord" ADD CONSTRAINT "PriceRecord_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceRecord" ADD CONSTRAINT "PriceRecord_recyclerId_fkey" FOREIGN KEY ("recyclerId") REFERENCES "Recycler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceQuote" ADD CONSTRAINT "PriceQuote_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceQuote" ADD CONSTRAINT "PriceQuote_recyclerId_fkey" FOREIGN KEY ("recyclerId") REFERENCES "Recycler"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recyclerId_fkey" FOREIGN KEY ("recyclerId") REFERENCES "Recycler"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_recyclerId_fkey" FOREIGN KEY ("recyclerId") REFERENCES "Recycler"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraceabilityEvent" ADD CONSTRAINT "TraceabilityEvent_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
