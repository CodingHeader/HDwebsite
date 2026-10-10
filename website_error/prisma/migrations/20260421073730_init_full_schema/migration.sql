/*
  Warnings:

  - You are about to drop the `Admin` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `slug` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Setting` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Admin_username_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Admin";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Role" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT NOT NULL,
    "isSuper" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "email" TEXT,
    "nickname" TEXT,
    "realName" TEXT,
    "avatar" TEXT,
    "phone" TEXT,
    "roleId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastLoginAt" DATETIME,
    "lastLoginIp" TEXT,
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Navigation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" INTEGER,
    "level" INTEGER NOT NULL DEFAULT 1,
    "icon" TEXT,
    "link" TEXT,
    "linkType" TEXT NOT NULL DEFAULT 'internal',
    "target" TEXT NOT NULL DEFAULT '_self',
    "templateId" INTEGER,
    "categoryId" INTEGER,
    "contentType" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isNav" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT,
    "hoverEffect" TEXT,
    "clickAction" TEXT,
    "activeIndicator" TEXT,
    "seoTitle" TEXT,
    "seoKeywords" TEXT,
    "seoDescription" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Navigation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Navigation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Navigation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PageTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Navigation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Article" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "coverImage" TEXT,
    "authorId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isTop" BOOLEAN NOT NULL DEFAULT false,
    "isRecommend" BOOLEAN NOT NULL DEFAULT false,
    "isHot" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoKeywords" TEXT,
    "seoDescription" TEXT,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Article_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ArticleTag" (
    "articleId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    PRIMARY KEY ("articleId", "tagId"),
    CONSTRAINT "ArticleTag_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ArticleTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PageTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "layout" TEXT NOT NULL DEFAULT 'default',
    "contentType" TEXT,
    "templateFile" TEXT NOT NULL,
    "thumbnail" TEXT,
    "config" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ContentBlock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "contentType" TEXT,
    "query" TEXT,
    "limit" INTEGER,
    "content" TEXT,
    "style" TEXT,
    "interactions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TemplateBlock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "templateId" INTEGER NOT NULL,
    "blockId" INTEGER NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "config" TEXT,
    CONSTRAINT "TemplateBlock_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PageTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TemplateBlock_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "ContentBlock" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Media" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'image',
    "category" TEXT,
    "uploaderId" INTEGER NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Media_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ElementConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "elementId" TEXT NOT NULL,
    "elementName" TEXT NOT NULL,
    "layer" INTEGER NOT NULL,
    "layerName" TEXT NOT NULL,
    "navigationId" INTEGER,
    "elementType" TEXT,
    "selector" TEXT,
    "position" TEXT,
    "interactions" TEXT,
    "normalState" TEXT,
    "hoverState" TEXT,
    "activeState" TEXT,
    "content" TEXT,
    "icon" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ElementConfig_navigationId_fkey" FOREIGN KEY ("navigationId") REFERENCES "Navigation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "apiEndpoint" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gpt-3.5-turbo',
    "systemPrompt" TEXT,
    "userPrompt" TEXT,
    "greeting" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 1000,
    "rateLimit" INTEGER NOT NULL DEFAULT 60,
    "dailyQuota" INTEGER NOT NULL DEFAULT 1000,
    "allowedDomains" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AIChatHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "role" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "model" TEXT,
    "temperature" REAL,
    "tokensUsed" INTEGER,
    "responseTime" INTEGER,
    "pageUrl" TEXT,
    "pageTitle" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserAction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "actionType" TEXT NOT NULL,
    "actionTarget" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "pageUrl" TEXT,
    "pageTitle" TEXT,
    "referrer" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ViewStats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contentType" TEXT NOT NULL,
    "contentId" INTEGER NOT NULL,
    "viewDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT,
    "referrer" TEXT
);

-- CreateTable
CREATE TABLE "OperationLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "username" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OperationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ManagerMenu" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "path" TEXT,
    "parentId" INTEGER,
    "level" INTEGER NOT NULL DEFAULT 1,
    "permission" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "badge" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ManagerMenu_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ManagerMenu" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "parentId" INTEGER,
    "type" TEXT NOT NULL DEFAULT 'article',
    "templateList" TEXT,
    "templateDetail" TEXT,
    "seoTitle" TEXT,
    "seoKeywords" TEXT,
    "seoDescription" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "isNav" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Category" ("createdAt", "id", "name", "sort") SELECT "createdAt", "id", "name", "sort" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");
CREATE INDEX "Category_type_idx" ON "Category"("type");
CREATE INDEX "Category_slug_idx" ON "Category"("slug");
CREATE INDEX "Category_isVisible_idx" ON "Category"("isVisible");
CREATE INDEX "Category_sort_idx" ON "Category"("sort");
CREATE TABLE "new_Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "type" TEXT NOT NULL DEFAULT 'string',
    "group" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Setting" ("id", "key", "value") SELECT "id", "key", "value" FROM "Setting";
DROP TABLE "Setting";
ALTER TABLE "new_Setting" RENAME TO "Setting";
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");
CREATE INDEX "Setting_group_idx" ON "Setting"("group");
CREATE INDEX "Setting_isPublic_idx" ON "Setting"("isPublic");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Role_slug_key" ON "Role"("slug");

-- CreateIndex
CREATE INDEX "Role_slug_idx" ON "Role"("slug");

-- CreateIndex
CREATE INDEX "Role_status_idx" ON "Role"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Navigation_slug_key" ON "Navigation"("slug");

-- CreateIndex
CREATE INDEX "Navigation_parentId_idx" ON "Navigation"("parentId");

-- CreateIndex
CREATE INDEX "Navigation_level_idx" ON "Navigation"("level");

-- CreateIndex
CREATE INDEX "Navigation_slug_idx" ON "Navigation"("slug");

-- CreateIndex
CREATE INDEX "Navigation_sort_idx" ON "Navigation"("sort");

-- CreateIndex
CREATE INDEX "Navigation_status_idx" ON "Navigation"("status");

-- CreateIndex
CREATE INDEX "Navigation_isVisible_idx" ON "Navigation"("isVisible");

-- CreateIndex
CREATE INDEX "Navigation_templateId_idx" ON "Navigation"("templateId");

-- CreateIndex
CREATE INDEX "Navigation_categoryId_idx" ON "Navigation"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_categoryId_idx" ON "Article"("categoryId");

-- CreateIndex
CREATE INDEX "Article_authorId_idx" ON "Article"("authorId");

-- CreateIndex
CREATE INDEX "Article_status_idx" ON "Article"("status");

-- CreateIndex
CREATE INDEX "Article_publishedAt_idx" ON "Article"("publishedAt");

-- CreateIndex
CREATE INDEX "Article_isTop_idx" ON "Article"("isTop");

-- CreateIndex
CREATE INDEX "Article_isRecommend_idx" ON "Article"("isRecommend");

-- CreateIndex
CREATE INDEX "Article_isHot_idx" ON "Article"("isHot");

-- CreateIndex
CREATE INDEX "Article_slug_idx" ON "Article"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "Tag_slug_idx" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "ArticleTag_articleId_idx" ON "ArticleTag"("articleId");

-- CreateIndex
CREATE INDEX "ArticleTag_tagId_idx" ON "ArticleTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "PageTemplate_code_key" ON "PageTemplate"("code");

-- CreateIndex
CREATE INDEX "PageTemplate_code_idx" ON "PageTemplate"("code");

-- CreateIndex
CREATE INDEX "PageTemplate_contentType_idx" ON "PageTemplate"("contentType");

-- CreateIndex
CREATE INDEX "PageTemplate_status_idx" ON "PageTemplate"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ContentBlock_code_key" ON "ContentBlock"("code");

-- CreateIndex
CREATE INDEX "ContentBlock_type_idx" ON "ContentBlock"("type");

-- CreateIndex
CREATE INDEX "ContentBlock_contentType_idx" ON "ContentBlock"("contentType");

-- CreateIndex
CREATE INDEX "ContentBlock_status_idx" ON "ContentBlock"("status");

-- CreateIndex
CREATE INDEX "TemplateBlock_templateId_idx" ON "TemplateBlock"("templateId");

-- CreateIndex
CREATE INDEX "TemplateBlock_blockId_idx" ON "TemplateBlock"("blockId");

-- CreateIndex
CREATE INDEX "TemplateBlock_sort_idx" ON "TemplateBlock"("sort");

-- CreateIndex
CREATE INDEX "Media_uploaderId_idx" ON "Media"("uploaderId");

-- CreateIndex
CREATE INDEX "Media_type_idx" ON "Media"("type");

-- CreateIndex
CREATE INDEX "Media_category_idx" ON "Media"("category");

-- CreateIndex
CREATE INDEX "Media_createdAt_idx" ON "Media"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ElementConfig_elementId_key" ON "ElementConfig"("elementId");

-- CreateIndex
CREATE INDEX "ElementConfig_elementId_idx" ON "ElementConfig"("elementId");

-- CreateIndex
CREATE INDEX "ElementConfig_layer_idx" ON "ElementConfig"("layer");

-- CreateIndex
CREATE INDEX "ElementConfig_navigationId_idx" ON "ElementConfig"("navigationId");

-- CreateIndex
CREATE INDEX "ElementConfig_status_idx" ON "ElementConfig"("status");

-- CreateIndex
CREATE INDEX "AIChatHistory_sessionId_idx" ON "AIChatHistory"("sessionId");

-- CreateIndex
CREATE INDEX "AIChatHistory_conversationId_idx" ON "AIChatHistory"("conversationId");

-- CreateIndex
CREATE INDEX "AIChatHistory_createdAt_idx" ON "AIChatHistory"("createdAt");

-- CreateIndex
CREATE INDEX "UserAction_actionType_idx" ON "UserAction"("actionType");

-- CreateIndex
CREATE INDEX "UserAction_sessionId_idx" ON "UserAction"("sessionId");

-- CreateIndex
CREATE INDEX "UserAction_createdAt_idx" ON "UserAction"("createdAt");

-- CreateIndex
CREATE INDEX "ViewStats_contentType_contentId_idx" ON "ViewStats"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "ViewStats_viewDate_idx" ON "ViewStats"("viewDate");

-- CreateIndex
CREATE INDEX "OperationLog_userId_idx" ON "OperationLog"("userId");

-- CreateIndex
CREATE INDEX "OperationLog_module_idx" ON "OperationLog"("module");

-- CreateIndex
CREATE INDEX "OperationLog_action_idx" ON "OperationLog"("action");

-- CreateIndex
CREATE INDEX "OperationLog_createdAt_idx" ON "OperationLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ManagerMenu_code_key" ON "ManagerMenu"("code");

-- CreateIndex
CREATE INDEX "ManagerMenu_parentId_idx" ON "ManagerMenu"("parentId");

-- CreateIndex
CREATE INDEX "ManagerMenu_level_idx" ON "ManagerMenu"("level");

-- CreateIndex
CREATE INDEX "ManagerMenu_code_idx" ON "ManagerMenu"("code");

-- CreateIndex
CREATE INDEX "ManagerMenu_sort_idx" ON "ManagerMenu"("sort");

-- CreateIndex
CREATE INDEX "ManagerMenu_isVisible_idx" ON "ManagerMenu"("isVisible");
