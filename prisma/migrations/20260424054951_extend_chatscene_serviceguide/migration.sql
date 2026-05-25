-- AlterTable
ALTER TABLE "ChatScene" ADD COLUMN "contactCardTitle" TEXT;
ALTER TABLE "ChatScene" ADD COLUMN "headerTip" TEXT;
ALTER TABLE "ChatScene" ADD COLUMN "pageSubtitle" TEXT;
ALTER TABLE "ChatScene" ADD COLUMN "pageTitle" TEXT;
ALTER TABLE "ChatScene" ADD COLUMN "processSteps" TEXT;
ALTER TABLE "ChatScene" ADD COLUMN "promiseList" TEXT;
ALTER TABLE "ChatScene" ADD COLUMN "sidebarTitle" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ServiceGuide" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "content" TEXT,
    "icon" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ServiceGuide" ("createdAt", "icon", "id", "link", "sort", "status", "title") SELECT "createdAt", "icon", "id", "link", "sort", "status", "title" FROM "ServiceGuide";
DROP TABLE "ServiceGuide";
ALTER TABLE "new_ServiceGuide" RENAME TO "ServiceGuide";
CREATE UNIQUE INDEX "ServiceGuide_slug_key" ON "ServiceGuide"("slug");
CREATE INDEX "ServiceGuide_slug_idx" ON "ServiceGuide"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
