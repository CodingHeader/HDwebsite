-- CreateTable
CREATE TABLE "HomeCard" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "HomeCard_status_idx" ON "HomeCard"("status");

-- CreateIndex
CREATE INDEX "HomeCard_sort_idx" ON "HomeCard"("sort");
