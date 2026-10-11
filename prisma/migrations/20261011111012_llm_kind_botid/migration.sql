-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LLMProvider" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'openai',
    "botId" TEXT,
    "endpoint" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT true,
    "model" TEXT NOT NULL,
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 2048,
    "topP" REAL,
    "priority" INTEGER NOT NULL DEFAULT 10,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "balance" REAL,
    "balanceCurrency" TEXT NOT NULL DEFAULT 'CNY',
    "balanceCheckedAt" DATETIME,
    "balanceThreshold" REAL,
    "dailyQuota" INTEGER NOT NULL DEFAULT 1000,
    "rateLimit" INTEGER NOT NULL DEFAULT 60,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_LLMProvider" ("apiKey", "balance", "balanceCheckedAt", "balanceCurrency", "balanceThreshold", "createdAt", "dailyQuota", "endpoint", "id", "isDefault", "isEncrypted", "isFallback", "maxTokens", "metadata", "model", "name", "priority", "rateLimit", "status", "temperature", "topP", "updatedAt") SELECT "apiKey", "balance", "balanceCheckedAt", "balanceCurrency", "balanceThreshold", "createdAt", "dailyQuota", "endpoint", "id", "isDefault", "isEncrypted", "isFallback", "maxTokens", "metadata", "model", "name", "priority", "rateLimit", "status", "temperature", "topP", "updatedAt" FROM "LLMProvider";
DROP TABLE "LLMProvider";
ALTER TABLE "new_LLMProvider" RENAME TO "LLMProvider";
CREATE INDEX "LLMProvider_status_idx" ON "LLMProvider"("status");
CREATE INDEX "LLMProvider_priority_idx" ON "LLMProvider"("priority");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
