-- P06 回滚说明（p06_collect_kb_review 全部为 ADD COLUMN / CREATE INDEX）
-- 即时关闭"采集默认入库"无需回滚：UPDATE "CollectSource" SET "autoToKb" = false;
-- SQLite ≥ 3.35 支持 DROP COLUMN（libsql 满足）；被索引的列须先删索引。执行前先备份数据库。
DROP INDEX IF EXISTS "Knowledge_syncStatus_idx";
ALTER TABLE "Knowledge" DROP COLUMN "syncedAt";
ALTER TABLE "Knowledge" DROP COLUMN "syncErr";
ALTER TABLE "Knowledge" DROP COLUMN "syncStatus";
ALTER TABLE "CollectItem" DROP COLUMN "kbSyncedAt";
ALTER TABLE "CollectSource" DROP COLUMN "autoApprove";
ALTER TABLE "CollectSource" DROP COLUMN "autoToKb";
ALTER TABLE "ChatScene" DROP COLUMN "llmProviderId";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261012154723_p06_collect_kb_review';
