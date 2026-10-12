-- P06 p06_collect_kb_review（仅加法：ADD COLUMN，无整表重建；SQLite 逐行安全）
-- CollectSource：默认入知识库 / 超管预授权自动通过
ALTER TABLE "CollectSource" ADD COLUMN "autoToKb" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CollectSource" ADD COLUMN "autoApprove" BOOLEAN NOT NULL DEFAULT false;

-- CollectItem：远端知识库同步完成时间
ALTER TABLE "CollectItem" ADD COLUMN "kbSyncedAt" DATETIME;

-- Knowledge：远端知识库同步队列（存量行 = local，不推送）
ALTER TABLE "Knowledge" ADD COLUMN "syncStatus" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "Knowledge" ADD COLUMN "syncErr" TEXT;
ALTER TABLE "Knowledge" ADD COLUMN "syncedAt" DATETIME;
CREATE INDEX "Knowledge_syncStatus_idx" ON "Knowledge"("syncStatus");

-- ChatScene：场景专属模型（无外键）
ALTER TABLE "ChatScene" ADD COLUMN "llmProviderId" INTEGER;
