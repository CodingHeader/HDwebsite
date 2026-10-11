/*
  Warnings:

  - The primary key for the `EnrollmentOffering` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `EnrollmentOffering` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `partnerId` on the `EnrollmentOffering` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Partner` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Partner` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EnrollmentOffering" (
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
INSERT INTO "new_EnrollmentOffering" ("createdAt", "educationType", "extraFeeNote", "feeDetail", "hasPrice", "id", "level", "majorCode", "majorId", "partnerId", "sort", "sourceBatch", "status", "studyForm", "totalTuition", "updatedAt", "yearTuition") SELECT "createdAt", "educationType", "extraFeeNote", "feeDetail", "hasPrice", "id", "level", "majorCode", "majorId", "partnerId", "sort", "sourceBatch", "status", "studyForm", "totalTuition", "updatedAt", "yearTuition" FROM "EnrollmentOffering";
DROP TABLE "EnrollmentOffering";
ALTER TABLE "new_EnrollmentOffering" RENAME TO "EnrollmentOffering";
CREATE INDEX "EnrollmentOffering_majorId_idx" ON "EnrollmentOffering"("majorId");
CREATE INDEX "EnrollmentOffering_partnerId_idx" ON "EnrollmentOffering"("partnerId");
CREATE INDEX "EnrollmentOffering_status_idx" ON "EnrollmentOffering"("status");
CREATE UNIQUE INDEX "EnrollmentOffering_sourceBatch_partnerId_majorId_educationType_level_majorCode_key" ON "EnrollmentOffering"("sourceBatch", "partnerId", "majorId", "educationType", "level", "majorCode");
CREATE TABLE "new_Partner" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "website" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Partner" ("createdAt", "id", "logo", "name", "sort", "status", "updatedAt", "website") SELECT "createdAt", "id", "logo", "name", "sort", "status", "updatedAt", "website" FROM "Partner";
DROP TABLE "Partner";
ALTER TABLE "new_Partner" RENAME TO "Partner";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
