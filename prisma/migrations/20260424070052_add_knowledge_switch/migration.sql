-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChatScene" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "greeting" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "knowledgeTags" TEXT NOT NULL DEFAULT '',
    "starters" TEXT,
    "pageTitle" TEXT,
    "pageSubtitle" TEXT,
    "headerTip" TEXT,
    "sidebarTitle" TEXT,
    "processSteps" TEXT,
    "promiseList" TEXT,
    "contactCardTitle" TEXT,
    "useKnowledgeBase" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ChatScene" ("code", "contactCardTitle", "createdAt", "description", "greeting", "headerTip", "id", "knowledgeTags", "name", "pageSubtitle", "pageTitle", "processSteps", "promiseList", "sidebarTitle", "sort", "starters", "status", "systemPrompt", "updatedAt") SELECT "code", "contactCardTitle", "createdAt", "description", "greeting", "headerTip", "id", "knowledgeTags", "name", "pageSubtitle", "pageTitle", "processSteps", "promiseList", "sidebarTitle", "sort", "starters", "status", "systemPrompt", "updatedAt" FROM "ChatScene";
DROP TABLE "ChatScene";
ALTER TABLE "new_ChatScene" RENAME TO "ChatScene";
CREATE UNIQUE INDEX "ChatScene_code_key" ON "ChatScene"("code");
CREATE INDEX "ChatScene_status_idx" ON "ChatScene"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
