-- CreateTable
CREATE TABLE "Finish" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "costPerSqIn" DOUBLE PRECISION NOT NULL,
    "leadTimeDays" INTEGER NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Finish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "markup" DOUBLE PRECISION NOT NULL,
    "density" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Process" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "setupTime" INTEGER NOT NULL,
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "minimumCost" DOUBLE PRECISION NOT NULL,
    "complexityMultiplier" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Routing" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "totalSetupTime" INTEGER NOT NULL,
    "estimatedLeadTime" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "materialMarkup" DOUBLE PRECISION NOT NULL,
    "finishingCost" DOUBLE PRECISION NOT NULL,
    "isPrimaryPricingRoute" BOOLEAN NOT NULL DEFAULT false,
    "finishId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Routing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutingStep" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "processName" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "setupTimeMultiplier" DOUBLE PRECISION NOT NULL,
    "runtimeMultiplier" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "setupTime" INTEGER NOT NULL,
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "minimumCost" DOUBLE PRECISION NOT NULL,
    "complexityMultiplier" DOUBLE PRECISION NOT NULL,
    "routingId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "RoutingStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingConfiguration" (
    "id" TEXT NOT NULL,
    "defaultTierMultipliers" JSONB NOT NULL,
    "volumeBreaks" JSONB NOT NULL,
    "minimumOrderValue" DOUBLE PRECISION NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',

    CONSTRAINT "PricingConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutingPricing" (
    "id" TEXT NOT NULL,
    "routingId" TEXT NOT NULL,
    "routingName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "baseCost" DOUBLE PRECISION NOT NULL,
    "materialMarkup" DOUBLE PRECISION NOT NULL,
    "finishingCost" DOUBLE PRECISION NOT NULL,
    "leadTime" INTEGER NOT NULL,
    "tierOverrides" JSONB,
    "configurationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "RoutingPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Part" (
    "id" TEXT NOT NULL,
    "partName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "tolerance" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileUrl" TEXT,
    "processId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "finishId" TEXT,
    "routingId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "password" TEXT NOT NULL,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLogin" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationBackup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MigrationBackup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MaterialToProcess" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MaterialToProcess_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Finish_type_idx" ON "Finish"("type");

-- CreateIndex
CREATE INDEX "Finish_active_idx" ON "Finish"("active");

-- CreateIndex
CREATE INDEX "Material_active_idx" ON "Material"("active");

-- CreateIndex
CREATE INDEX "Process_category_idx" ON "Process"("category");

-- CreateIndex
CREATE INDEX "Process_active_idx" ON "Process"("active");

-- CreateIndex
CREATE INDEX "Routing_category_idx" ON "Routing"("category");

-- CreateIndex
CREATE INDEX "Routing_active_idx" ON "Routing"("active");

-- CreateIndex
CREATE INDEX "RoutingStep_routingId_idx" ON "RoutingStep"("routingId");

-- CreateIndex
CREATE INDEX "RoutingStep_processId_idx" ON "RoutingStep"("processId");

-- CreateIndex
CREATE INDEX "RoutingStep_sequence_idx" ON "RoutingStep"("sequence");

-- CreateIndex
CREATE INDEX "PricingConfiguration_status_idx" ON "PricingConfiguration"("status");

-- CreateIndex
CREATE INDEX "RoutingPricing_category_idx" ON "RoutingPricing"("category");

-- CreateIndex
CREATE INDEX "RoutingPricing_configurationId_idx" ON "RoutingPricing"("configurationId");

-- CreateIndex
CREATE INDEX "Part_processId_idx" ON "Part"("processId");

-- CreateIndex
CREATE INDEX "Part_materialId_idx" ON "Part"("materialId");

-- CreateIndex
CREATE INDEX "Part_finishId_idx" ON "Part"("finishId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MigrationBackup_name_key" ON "MigrationBackup"("name");

-- CreateIndex
CREATE INDEX "MigrationBackup_name_idx" ON "MigrationBackup"("name");

-- CreateIndex
CREATE INDEX "MigrationBackup_timestamp_idx" ON "MigrationBackup"("timestamp");

-- CreateIndex
CREATE INDEX "_MaterialToProcess_B_index" ON "_MaterialToProcess"("B");

-- AddForeignKey
ALTER TABLE "Routing" ADD CONSTRAINT "Routing_finishId_fkey" FOREIGN KEY ("finishId") REFERENCES "Finish"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingStep" ADD CONSTRAINT "RoutingStep_routingId_fkey" FOREIGN KEY ("routingId") REFERENCES "Routing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingStep" ADD CONSTRAINT "RoutingStep_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingPricing" ADD CONSTRAINT "RoutingPricing_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "PricingConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Part" ADD CONSTRAINT "Part_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Part" ADD CONSTRAINT "Part_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Part" ADD CONSTRAINT "Part_finishId_fkey" FOREIGN KEY ("finishId") REFERENCES "Finish"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Part" ADD CONSTRAINT "Part_routingId_fkey" FOREIGN KEY ("routingId") REFERENCES "Routing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MaterialToProcess" ADD CONSTRAINT "_MaterialToProcess_A_fkey" FOREIGN KEY ("A") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MaterialToProcess" ADD CONSTRAINT "_MaterialToProcess_B_fkey" FOREIGN KEY ("B") REFERENCES "Process"("id") ON DELETE CASCADE ON UPDATE CASCADE;
