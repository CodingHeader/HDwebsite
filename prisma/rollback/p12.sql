-- P12 回滚（p12_knowledge_base：仅 CREATE TABLE / ALTER TABLE ADD COLUMN / CREATE INDEX，无整表重建）
-- 说明：
--   - SQLite ≥ 3.35 支持 DROP COLUMN（libsql 满足）；被索引的列须先删索引。
--   - 存在 Knowledge.baseId / fileId 与 KnowledgeFile.collectItemId 的回链数据；回滚会丢失这些数据，
--     执行前先备份数据库（`prisma/backups/` 或手工 cp）。
--   - 回滚后 schema 应与 p06_collect_kb_review 之后、p12 之前逐对象全等；可再次 `prisma migrate deploy` 重放 p12。

-- Knowledge：先删本迁移新增的索引（否则 DROP COLUMN 报错）
DROP INDEX IF EXISTS "Knowledge_baseId_status_idx";
DROP INDEX IF EXISTS "Knowledge_fileId_idx";

ALTER TABLE "Knowledge" DROP COLUMN "chunkIndex";
ALTER TABLE "Knowledge" DROP COLUMN "fileId";
ALTER TABLE "Knowledge" DROP COLUMN "baseId";

-- ChatScene
ALTER TABLE "ChatScene" DROP COLUMN "topP";
ALTER TABLE "ChatScene" DROP COLUMN "temperature";
ALTER TABLE "ChatScene" DROP COLUMN "maxTokens";
ALTER TABLE "ChatScene" DROP COLUMN "providerIds";

-- CollectSource
ALTER TABLE "CollectSource" DROP COLUMN "knowledgeBaseId";

-- KnowledgeFile：先删索引再删表
DROP INDEX IF EXISTS "KnowledgeFile_baseId_sha256_key";
DROP INDEX IF EXISTS "KnowledgeFile_baseId_deletedAt_idx";
DROP INDEX IF EXISTS "KnowledgeFile_deletedAt_idx";
DROP INDEX IF EXISTS "KnowledgeFile_collectItemId_idx";
DROP INDEX IF EXISTS "KnowledgeFile_cozeDocumentId_idx";
DROP INDEX IF EXISTS "KnowledgeFile_baseId_idx";

DROP TABLE "KnowledgeFile";

-- KnowledgeBase：先删索引再删表
DROP INDEX IF EXISTS "KnowledgeBase_status_idx";
DROP INDEX IF EXISTS "KnowledgeBase_cozeDatasetId_idx";
DROP INDEX IF EXISTS "KnowledgeBase_code_key";

DROP TABLE "KnowledgeBase";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261014073639_p12_knowledge_base';