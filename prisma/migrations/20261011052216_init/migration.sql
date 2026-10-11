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
    CONSTRAINT "Navigation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "parentId" INTEGER,
    "type" TEXT NOT NULL DEFAULT 'article',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "isNav" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ManagerMenu" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT,
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

-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "type" TEXT NOT NULL DEFAULT 'string',
    "group" TEXT NOT NULL DEFAULT 'site',
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Article" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'html',
    "channel" TEXT NOT NULL DEFAULT 'info',
    "excerpt" TEXT,
    "coverImage" TEXT,
    "authorId" INTEGER NOT NULL,
    "categoryId" INTEGER,
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
    CONSTRAINT "Article_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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
CREATE TABLE "Course" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL NOT NULL DEFAULT 0,
    "priceText" TEXT,
    "duration" TEXT,
    "outline" TEXT,
    "cover" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "categoryId" INTEGER,
    "majorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Course_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Course_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Student" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "courseId" INTEGER,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "website" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

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
    "id" TEXT NOT NULL PRIMARY KEY,
    "majorId" INTEGER NOT NULL,
    "partnerId" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "Campus" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CampusImage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "campusId" INTEGER NOT NULL,
    "image" TEXT NOT NULL,
    "caption" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampusImage_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Gallery" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'certificate',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Banner" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "image" TEXT NOT NULL,
    "link" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HomeCard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "icon" TEXT,
    "href" TEXT,
    "gradient" TEXT,
    "hoverGradient" TEXT,
    "shadow" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HotMajor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '专升本',
    "description" TEXT,
    "duration" TEXT NOT NULL DEFAULT '2年',
    "iconType" TEXT NOT NULL DEFAULT 'text',
    "iconImage" TEXT,
    "iconColor" TEXT,
    "backgroundImage" TEXT,
    "link" TEXT NOT NULL DEFAULT '/apply',
    "majorId" INTEGER,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HotMajor_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceGuide" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "content" TEXT,
    "contentType" TEXT NOT NULL DEFAULT 'html',
    "icon" TEXT,
    "link" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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
    "uploaderId" INTEGER,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Media_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LLMProvider" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "LLMUsage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LLMUsage_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "LLMProvider" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIChatHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" TEXT NOT NULL,
    "conversationId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'website',
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
CREATE TABLE "Knowledge" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT,
    "source" TEXT NOT NULL DEFAULT 'local',
    "externalId" TEXT,
    "externalUrl" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChatScene" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "greeting" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "knowledgeTags" TEXT,
    "baseIds" TEXT,
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
    "viewDate" DATETIME NOT NULL,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT,
    "referrer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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
CREATE TABLE "CronJob" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "cron" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" DATETIME,
    "lockedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'markdown',
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "coverImage" TEXT,
    "authorId" INTEGER,
    "tags" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "collectItemId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContentItem_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ContentItem_collectItemId_fkey" FOREIGN KEY ("collectItemId") REFERENCES "CollectItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentChannel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "itemId" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "accountId" INTEGER,
    "externalId" TEXT,
    "externalUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unsent',
    "errMsg" TEXT,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContentChannel_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ContentItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContentChannel_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "WechatAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PublishJob" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "itemId" INTEGER,
    "contentType" TEXT NOT NULL DEFAULT 'article',
    "channel" TEXT NOT NULL DEFAULT 'website',
    "accountId" INTEGER,
    "action" TEXT NOT NULL DEFAULT 'publish',
    "scheduledAt" DATETIME,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "preNotify" BOOLEAN NOT NULL DEFAULT true,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "notifySentAt" DATETIME,
    "result" TEXT,
    "errMsg" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PublishJob_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ContentItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PublishJob_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "WechatAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollectSource" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'html',
    "url" TEXT NOT NULL,
    "parser" TEXT,
    "cron" TEXT NOT NULL DEFAULT '0 4 * * *',
    "autoTags" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" DATETIME,
    "lastStatus" TEXT,
    "errMsg" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CollectTask" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sourceId" INTEGER NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'running',
    "newCount" INTEGER NOT NULL DEFAULT 0,
    "skipCount" INTEGER NOT NULL DEFAULT 0,
    "stat" TEXT,
    "errMsg" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectTask_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "CollectSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollectItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sourceId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "urlHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rawContent" TEXT,
    "contentMd" TEXT,
    "images" TEXT,
    "summary" TEXT,
    "publishTime" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'new',
    "knowledgeId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CollectItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "CollectSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotifyRecipient" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "groups" TEXT NOT NULL DEFAULT '["publish"]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NotifyRule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "event" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "templateId" INTEGER,
    "recipientGroups" TEXT NOT NULL DEFAULT '["publish"]',
    "quietHours" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotifyRule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotifyTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotifyTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "event" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NotifyRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ruleId" INTEGER,
    "event" TEXT NOT NULL,
    "toEmails" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "retries" INTEGER NOT NULL DEFAULT 0,
    "errMsg" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotifyRecord_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "NotifyRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WechatAccount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'service',
    "appid" TEXT NOT NULL,
    "appSecret" TEXT NOT NULL,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT true,
    "verifyToken" TEXT,
    "encodingAESKey" TEXT,
    "tokenCache" TEXT,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "freepublishEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sceneId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WechatAccount_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "ChatScene" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

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
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Navigation_slug_key" ON "Navigation"("slug");

-- CreateIndex
CREATE INDEX "Navigation_parentId_idx" ON "Navigation"("parentId");

-- CreateIndex
CREATE INDEX "Navigation_status_idx" ON "Navigation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_type_idx" ON "Category"("type");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagerMenu_code_key" ON "ManagerMenu"("code");

-- CreateIndex
CREATE INDEX "ManagerMenu_parentId_idx" ON "ManagerMenu"("parentId");

-- CreateIndex
CREATE INDEX "ManagerMenu_level_idx" ON "ManagerMenu"("level");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "Setting_group_idx" ON "Setting"("group");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_status_idx" ON "Article"("status");

-- CreateIndex
CREATE INDEX "Article_channel_idx" ON "Article"("channel");

-- CreateIndex
CREATE INDEX "Article_categoryId_idx" ON "Article"("categoryId");

-- CreateIndex
CREATE INDEX "Article_publishedAt_idx" ON "Article"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "Course_categoryId_idx" ON "Course"("categoryId");

-- CreateIndex
CREATE INDEX "Course_majorId_idx" ON "Course"("majorId");

-- CreateIndex
CREATE INDEX "Course_status_idx" ON "Course"("status");

-- CreateIndex
CREATE INDEX "Student_status_idx" ON "Student"("status");

-- CreateIndex
CREATE INDEX "Student_courseId_idx" ON "Student"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Major_name_key" ON "Major"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Major_slug_key" ON "Major"("slug");

-- CreateIndex
CREATE INDEX "Major_categoryId_idx" ON "Major"("categoryId");

-- CreateIndex
CREATE INDEX "Major_status_idx" ON "Major"("status");

-- CreateIndex
CREATE INDEX "EnrollmentOffering_majorId_idx" ON "EnrollmentOffering"("majorId");

-- CreateIndex
CREATE INDEX "EnrollmentOffering_partnerId_idx" ON "EnrollmentOffering"("partnerId");

-- CreateIndex
CREATE INDEX "EnrollmentOffering_status_idx" ON "EnrollmentOffering"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentOffering_sourceBatch_partnerId_majorId_educationType_level_majorCode_key" ON "EnrollmentOffering"("sourceBatch", "partnerId", "majorId", "educationType", "level", "majorCode");

-- CreateIndex
CREATE INDEX "CampusImage_campusId_idx" ON "CampusImage"("campusId");

-- CreateIndex
CREATE INDEX "Gallery_category_idx" ON "Gallery"("category");

-- CreateIndex
CREATE INDEX "Banner_status_idx" ON "Banner"("status");

-- CreateIndex
CREATE INDEX "HomeCard_status_idx" ON "HomeCard"("status");

-- CreateIndex
CREATE INDEX "HotMajor_status_idx" ON "HotMajor"("status");

-- CreateIndex
CREATE INDEX "HotMajor_majorId_idx" ON "HotMajor"("majorId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceGuide_slug_key" ON "ServiceGuide"("slug");

-- CreateIndex
CREATE INDEX "ServiceGuide_status_idx" ON "ServiceGuide"("status");

-- CreateIndex
CREATE INDEX "Media_type_idx" ON "Media"("type");

-- CreateIndex
CREATE INDEX "Media_uploaderId_idx" ON "Media"("uploaderId");

-- CreateIndex
CREATE INDEX "LLMProvider_status_idx" ON "LLMProvider"("status");

-- CreateIndex
CREATE INDEX "LLMProvider_priority_idx" ON "LLMProvider"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "LLMUsage_date_providerId_key" ON "LLMUsage"("date", "providerId");

-- CreateIndex
CREATE INDEX "AIChatHistory_sessionId_idx" ON "AIChatHistory"("sessionId");

-- CreateIndex
CREATE INDEX "AIChatHistory_channel_idx" ON "AIChatHistory"("channel");

-- CreateIndex
CREATE INDEX "AIChatHistory_createdAt_idx" ON "AIChatHistory"("createdAt");

-- CreateIndex
CREATE INDEX "Knowledge_status_idx" ON "Knowledge"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ChatScene_code_key" ON "ChatScene"("code");

-- CreateIndex
CREATE INDEX "UserAction_actionType_idx" ON "UserAction"("actionType");

-- CreateIndex
CREATE INDEX "UserAction_createdAt_idx" ON "UserAction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ViewStats_contentType_contentId_viewDate_key" ON "ViewStats"("contentType", "contentId", "viewDate");

-- CreateIndex
CREATE INDEX "OperationLog_userId_idx" ON "OperationLog"("userId");

-- CreateIndex
CREATE INDEX "OperationLog_module_idx" ON "OperationLog"("module");

-- CreateIndex
CREATE INDEX "OperationLog_createdAt_idx" ON "OperationLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CronJob_name_key" ON "CronJob"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ContentItem_collectItemId_key" ON "ContentItem"("collectItemId");

-- CreateIndex
CREATE INDEX "ContentItem_status_idx" ON "ContentItem"("status");

-- CreateIndex
CREATE INDEX "ContentItem_source_idx" ON "ContentItem"("source");

-- CreateIndex
CREATE INDEX "ContentItem_authorId_idx" ON "ContentItem"("authorId");

-- CreateIndex
CREATE INDEX "ContentChannel_itemId_idx" ON "ContentChannel"("itemId");

-- CreateIndex
CREATE INDEX "ContentChannel_channel_idx" ON "ContentChannel"("channel");

-- CreateIndex
CREATE INDEX "ContentChannel_status_idx" ON "ContentChannel"("status");

-- CreateIndex
CREATE INDEX "PublishJob_status_idx" ON "PublishJob"("status");

-- CreateIndex
CREATE INDEX "PublishJob_scheduledAt_idx" ON "PublishJob"("scheduledAt");

-- CreateIndex
CREATE INDEX "PublishJob_channel_idx" ON "PublishJob"("channel");

-- CreateIndex
CREATE INDEX "CollectSource_enabled_idx" ON "CollectSource"("enabled");

-- CreateIndex
CREATE INDEX "CollectTask_sourceId_idx" ON "CollectTask"("sourceId");

-- CreateIndex
CREATE INDEX "CollectTask_status_idx" ON "CollectTask"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CollectItem_urlHash_key" ON "CollectItem"("urlHash");

-- CreateIndex
CREATE INDEX "CollectItem_sourceId_idx" ON "CollectItem"("sourceId");

-- CreateIndex
CREATE INDEX "CollectItem_status_idx" ON "CollectItem"("status");

-- CreateIndex
CREATE INDEX "NotifyRecipient_enabled_idx" ON "NotifyRecipient"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "NotifyRule_event_key" ON "NotifyRule"("event");

-- CreateIndex
CREATE INDEX "NotifyRecord_event_idx" ON "NotifyRecord"("event");

-- CreateIndex
CREATE INDEX "NotifyRecord_status_idx" ON "NotifyRecord"("status");

-- CreateIndex
CREATE INDEX "NotifyRecord_createdAt_idx" ON "NotifyRecord"("createdAt");

-- CreateIndex
CREATE INDEX "WechatAccount_status_idx" ON "WechatAccount"("status");
