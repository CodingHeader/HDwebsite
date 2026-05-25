-- CreateTable
CREATE TABLE "Major" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "duration" TEXT,
    "cover" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "categoryId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Major_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EnrollmentOffering" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "majorId" INTEGER NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "sourceBatch" TEXT NOT NULL DEFAULT '26春',
    "educationType" TEXT NOT NULL DEFAULT '自考',
    "level" TEXT,
    "majorCode" TEXT,
    "studyForm" TEXT,
    "yearTuition" REAL,
    "totalTuition" REAL,
    "feeDetail" TEXT,
    "extraFeeNote" TEXT,
    "hasPrice" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EnrollmentOffering_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EnrollmentOffering_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Course" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL NOT NULL DEFAULT 0,
    "priceText" TEXT,
    "duration" TEXT,
    "outline" TEXT,
    "cover" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "categoryId" INTEGER NOT NULL,
    "majorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Course_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Course_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Course" ("categoryId", "cover", "createdAt", "description", "duration", "id", "outline", "price", "status", "title", "updatedAt") SELECT "categoryId", "cover", "createdAt", "description", "duration", "id", "outline", "price", "status", "title", "updatedAt" FROM "Course";
DROP TABLE "Course";
ALTER TABLE "new_Course" RENAME TO "Course";
CREATE INDEX "Course_majorId_idx" ON "Course"("majorId");
CREATE TABLE "new_HotMajor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '专升本',
    "description" TEXT,
    "duration" TEXT NOT NULL DEFAULT '2年',
    "majorId" INTEGER,
    "iconType" TEXT NOT NULL DEFAULT 'text',
    "iconImage" TEXT,
    "iconColor" TEXT NOT NULL DEFAULT 'from-blue-500 to-blue-600',
    "link" TEXT NOT NULL DEFAULT '/apply',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HotMajor_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_HotMajor" ("createdAt", "description", "duration", "iconColor", "iconImage", "iconType", "id", "link", "sort", "status", "subtitle", "title", "updatedAt") SELECT "createdAt", "description", "duration", "iconColor", "iconImage", "iconType", "id", "link", "sort", "status", "subtitle", "title", "updatedAt" FROM "HotMajor";
DROP TABLE "HotMajor";
ALTER TABLE "new_HotMajor" RENAME TO "HotMajor";
CREATE INDEX "HotMajor_status_idx" ON "HotMajor"("status");
CREATE INDEX "HotMajor_sort_idx" ON "HotMajor"("sort");
CREATE INDEX "HotMajor_majorId_idx" ON "HotMajor"("majorId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Major_name_key" ON "Major"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Major_slug_key" ON "Major"("slug");

-- CreateIndex
CREATE INDEX "Major_status_idx" ON "Major"("status");

-- CreateIndex
CREATE INDEX "Major_sort_idx" ON "Major"("sort");

-- CreateIndex
CREATE INDEX "Major_categoryId_idx" ON "Major"("categoryId");

-- CreateIndex
CREATE INDEX "EnrollmentOffering_majorId_educationType_level_status_idx" ON "EnrollmentOffering"("majorId", "educationType", "level", "status");

-- CreateIndex
CREATE INDEX "EnrollmentOffering_partnerId_status_idx" ON "EnrollmentOffering"("partnerId", "status");

-- CreateIndex
CREATE INDEX "EnrollmentOffering_sourceBatch_status_idx" ON "EnrollmentOffering"("sourceBatch", "status");

-- CreateIndex
CREATE INDEX "EnrollmentOffering_hasPrice_status_idx" ON "EnrollmentOffering"("hasPrice", "status");

-- CreateIndex
CREATE INDEX "EnrollmentOffering_totalTuition_idx" ON "EnrollmentOffering"("totalTuition");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentOffering_sourceBatch_partnerId_majorId_educationType_level_majorCode_key" ON "EnrollmentOffering"("sourceBatch", "partnerId", "majorId", "educationType", "level", "majorCode");
