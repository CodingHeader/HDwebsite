-- AlterTable: HomeCard 添加背景图片、描述、标签字段
ALTER TABLE "HomeCard" ADD COLUMN "backgroundImage" TEXT;
ALTER TABLE "HomeCard" ADD COLUMN "backgroundType" TEXT NOT NULL DEFAULT 'gradient';
ALTER TABLE "HomeCard" ADD COLUMN "description" TEXT;
ALTER TABLE "HomeCard" ADD COLUMN "badge" TEXT;
