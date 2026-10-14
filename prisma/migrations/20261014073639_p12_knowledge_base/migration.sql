-- AlterTable
ALTER TABLE "ChatScene" ADD COLUMN "maxTokens" INTEGER;
ALTER TABLE "ChatScene" ADD COLUMN "providerIds" TEXT;
ALTER TABLE "ChatScene" ADD COLUMN "temperature" REAL;
ALTER TABLE "ChatScene" ADD COLUMN "topP" REAL;

-- AlterTable
ALTER TABLE "CollectSource" ADD COLUMN "knowledgeBaseId" INTEGER;

-- AlterTable
ALTER TABLE "Knowledge" ADD COLUMN "baseId" INTEGER;
ALTER TABLE "Knowledge" ADD COLUMN "chunkIndex" INTEGER;
ALTER TABLE "Knowledge" ADD COLUMN "fileId" INTEGER;

-- CreateTable
CREATE TABLE "KnowledgeBase" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "cozeDatasetId" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'local',
    "syncErr" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "KnowledgeFile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "baseId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "ext" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "localParse" TEXT NOT NULL DEFAULT 'pending',
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "cozeDocumentId" TEXT,
    "cozeStatus" INTEGER,
    "cozeProgress" INTEGER,
    "collectItemId" INTEGER,
    "deletedAt" DATETIME,
    "errMsg" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeBase_code_key" ON "KnowledgeBase"("code");

-- CreateIndex
CREATE INDEX "KnowledgeBase_cozeDatasetId_idx" ON "KnowledgeBase"("cozeDatasetId");

-- CreateIndex
CREATE INDEX "KnowledgeBase_status_idx" ON "KnowledgeBase"("status");

-- CreateIndex
CREATE INDEX "KnowledgeFile_baseId_idx" ON "KnowledgeFile"("baseId");

-- CreateIndex
CREATE INDEX "KnowledgeFile_cozeDocumentId_idx" ON "KnowledgeFile"("cozeDocumentId");

-- CreateIndex
CREATE INDEX "KnowledgeFile_collectItemId_idx" ON "KnowledgeFile"("collectItemId");

-- CreateIndex
CREATE INDEX "KnowledgeFile_deletedAt_idx" ON "KnowledgeFile"("deletedAt");

-- CreateIndex
CREATE INDEX "KnowledgeFile_baseId_deletedAt_idx" ON "KnowledgeFile"("baseId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeFile_baseId_sha256_key" ON "KnowledgeFile"("baseId", "sha256");

-- CreateIndex
CREATE INDEX "Knowledge_baseId_status_idx" ON "Knowledge"("baseId", "status");

-- CreateIndex
CREATE INDEX "Knowledge_fileId_idx" ON "Knowledge"("fileId");
