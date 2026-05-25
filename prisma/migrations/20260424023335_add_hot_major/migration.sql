-- CreateTable
CREATE TABLE "HotMajor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '专升本',
    "description" TEXT,
    "duration" TEXT NOT NULL DEFAULT '2年',
    "iconType" TEXT NOT NULL DEFAULT 'text',
    "iconImage" TEXT,
    "iconColor" TEXT NOT NULL DEFAULT 'from-blue-500 to-blue-600',
    "link" TEXT NOT NULL DEFAULT '/apply',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "HotMajor_status_idx" ON "HotMajor"("status");

-- CreateIndex
CREATE INDEX "HotMajor_sort_idx" ON "HotMajor"("sort");
