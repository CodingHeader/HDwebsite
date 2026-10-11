-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Course" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "price" REAL NOT NULL DEFAULT 0,
    "priceText" TEXT,
    "duration" TEXT,
    "outline" TEXT,
    "cover" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "categoryId" INTEGER,
    "majorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Course_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Course_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Course" ("categoryId", "cover", "createdAt", "description", "duration", "id", "majorId", "outline", "price", "priceText", "status", "title", "updatedAt") SELECT "categoryId", "cover", "createdAt", "description", "duration", "id", "majorId", "outline", "price", "priceText", "status", "title", "updatedAt" FROM "Course";
DROP TABLE "Course";
ALTER TABLE "new_Course" RENAME TO "Course";
CREATE INDEX "Course_categoryId_idx" ON "Course"("categoryId");
CREATE INDEX "Course_majorId_idx" ON "Course"("majorId");
CREATE INDEX "Course_status_idx" ON "Course"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
