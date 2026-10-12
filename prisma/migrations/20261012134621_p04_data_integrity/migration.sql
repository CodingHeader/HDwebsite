-- P04 p04_data_integrity：仅加法（CREATE TABLE ×4、ALTER TABLE ADD COLUMN ×1、CREATE INDEX）
-- CreateTable
CREATE TABLE "PageTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "layout" TEXT NOT NULL DEFAULT 'default',
    "contentType" TEXT,
    "templateFile" TEXT NOT NULL,
    "thumbnail" TEXT,
    "config" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ContentBlock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "contentType" TEXT,
    "query" TEXT,
    "limit" INTEGER,
    "content" TEXT,
    "style" TEXT,
    "interactions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TemplateBlock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "templateId" INTEGER NOT NULL,
    "blockId" INTEGER NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "config" TEXT,
    CONSTRAINT "TemplateBlock_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PageTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TemplateBlock_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "ContentBlock" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ElementConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "elementId" TEXT NOT NULL,
    "elementName" TEXT NOT NULL,
    "layer" INTEGER NOT NULL,
    "layerName" TEXT NOT NULL,
    "navigationId" INTEGER,
    "elementType" TEXT,
    "selector" TEXT,
    "position" TEXT,
    "interactions" TEXT,
    "normalState" TEXT,
    "hoverState" TEXT,
    "activeState" TEXT,
    "content" TEXT,
    "icon" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ElementConfig_navigationId_fkey" FOREIGN KEY ("navigationId") REFERENCES "Navigation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- AlterTable（ADR-024：Navigation 增可空列 templateId → PageTemplate）
-- 手工改写：Prisma 默认生成 RedefineTables（建新表→整表复制→删除旧表→改名），
-- 为避免整表重建，改为 SQLite 原生 ADD COLUMN（可空、默认 NULL、带外键），既有行与列原样保留。
ALTER TABLE "Navigation" ADD COLUMN "templateId" INTEGER REFERENCES "PageTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "PageTemplate_code_key" ON "PageTemplate"("code");

-- CreateIndex
CREATE INDEX "PageTemplate_code_idx" ON "PageTemplate"("code");

-- CreateIndex
CREATE INDEX "PageTemplate_contentType_idx" ON "PageTemplate"("contentType");

-- CreateIndex
CREATE INDEX "PageTemplate_status_idx" ON "PageTemplate"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ContentBlock_code_key" ON "ContentBlock"("code");

-- CreateIndex
CREATE INDEX "ContentBlock_type_idx" ON "ContentBlock"("type");

-- CreateIndex
CREATE INDEX "ContentBlock_contentType_idx" ON "ContentBlock"("contentType");

-- CreateIndex
CREATE INDEX "ContentBlock_status_idx" ON "ContentBlock"("status");

-- CreateIndex
CREATE INDEX "TemplateBlock_templateId_idx" ON "TemplateBlock"("templateId");

-- CreateIndex
CREATE INDEX "TemplateBlock_blockId_idx" ON "TemplateBlock"("blockId");

-- CreateIndex
CREATE INDEX "TemplateBlock_sort_idx" ON "TemplateBlock"("sort");

-- CreateIndex
CREATE UNIQUE INDEX "ElementConfig_elementId_key" ON "ElementConfig"("elementId");

-- CreateIndex
CREATE INDEX "ElementConfig_elementId_idx" ON "ElementConfig"("elementId");

-- CreateIndex
CREATE INDEX "ElementConfig_layer_idx" ON "ElementConfig"("layer");

-- CreateIndex
CREATE INDEX "ElementConfig_navigationId_idx" ON "ElementConfig"("navigationId");

-- CreateIndex
CREATE INDEX "ElementConfig_status_idx" ON "ElementConfig"("status");

-- CreateIndex
CREATE INDEX "AIChatHistory_ipAddress_createdAt_idx" ON "AIChatHistory"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "OperationLog_module_createdAt_idx" ON "OperationLog"("module", "createdAt");
