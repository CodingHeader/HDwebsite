-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_HomeCard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'MessageSquare',
    "href" TEXT NOT NULL DEFAULT '/courses',
    "gradient" TEXT NOT NULL DEFAULT 'from-blue-500 to-blue-600',
    "hoverGradient" TEXT NOT NULL DEFAULT 'from-blue-400 to-blue-500',
    "shadow" TEXT NOT NULL DEFAULT 'shadow-blue-200',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "showIcon" BOOLEAN NOT NULL DEFAULT true,
    "showTitle" BOOLEAN NOT NULL DEFAULT true,
    "showSubtitle" BOOLEAN NOT NULL DEFAULT true,
    "showArrow" BOOLEAN NOT NULL DEFAULT true,
    "showDecoration" BOOLEAN NOT NULL DEFAULT true,
    "textAlign" TEXT NOT NULL DEFAULT 'left',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_HomeCard" ("createdAt", "gradient", "hoverGradient", "href", "icon", "id", "shadow", "sort", "status", "subtitle", "title", "updatedAt") SELECT "createdAt", "gradient", "hoverGradient", "href", "icon", "id", "shadow", "sort", "status", "subtitle", "title", "updatedAt" FROM "HomeCard";
DROP TABLE "HomeCard";
ALTER TABLE "new_HomeCard" RENAME TO "HomeCard";
CREATE INDEX "HomeCard_status_idx" ON "HomeCard"("status");
CREATE INDEX "HomeCard_sort_idx" ON "HomeCard"("sort");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
