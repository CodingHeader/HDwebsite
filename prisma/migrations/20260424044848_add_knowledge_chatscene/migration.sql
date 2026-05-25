-- CreateTable
CREATE TABLE "Knowledge" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'local',
    "externalId" TEXT,
    "externalUrl" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChatScene" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "greeting" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "knowledgeTags" TEXT NOT NULL DEFAULT '',
    "starters" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Knowledge_status_idx" ON "Knowledge"("status");

-- CreateIndex
CREATE INDEX "Knowledge_tags_idx" ON "Knowledge"("tags");

-- CreateIndex
CREATE UNIQUE INDEX "ChatScene_code_key" ON "ChatScene"("code");

-- CreateIndex
CREATE INDEX "ChatScene_status_idx" ON "ChatScene"("status");
