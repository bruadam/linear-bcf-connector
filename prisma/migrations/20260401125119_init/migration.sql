-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "auth0Id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinearConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "linearOrgId" TEXT,
    "linearUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinearConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMapping" (
    "id" TEXT NOT NULL,
    "linearConnectionId" TEXT NOT NULL,
    "linearTeamId" TEXT NOT NULL,
    "linearTeamName" TEXT NOT NULL,
    "linearProjectId" TEXT,
    "linearProjectName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BcfServerConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectMappingId" TEXT,
    "serverUrl" TEXT NOT NULL,
    "remoteServerUrl" TEXT,
    "remoteClientId" TEXT,
    "remoteClientSecret" TEXT,
    "remoteAccessToken" TEXT,
    "remoteRefreshToken" TEXT,
    "remoteTokenExpiry" TIMESTAMP(3),
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BcfServerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "priorityLabels" JSONB NOT NULL DEFAULT '[]',
    "syncUsers" BOOLEAN NOT NULL DEFAULT true,
    "syncStatuses" BOOLEAN NOT NULL DEFAULT true,
    "syncLabels" BOOLEAN NOT NULL DEFAULT true,
    "linearClientId" TEXT,
    "linearClientSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BcfTopic" (
    "id" TEXT NOT NULL,
    "bcfGuid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT,
    "priority" TEXT,
    "assignedTo" TEXT,
    "dueDate" TIMESTAMP(3),
    "creationDate" TIMESTAMP(3),
    "modifiedDate" TIMESTAMP(3),
    "linearIssueId" TEXT,
    "linearIssueUrl" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BcfTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_auth0Id_key" ON "User"("auth0Id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LinearConnection_userId_key" ON "LinearConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMapping_linearConnectionId_key" ON "ProjectMapping"("linearConnectionId");

-- CreateIndex
CREATE UNIQUE INDEX "BcfServerConfig_userId_key" ON "BcfServerConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AppSettings_userId_key" ON "AppSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BcfTopic_bcfGuid_key" ON "BcfTopic"("bcfGuid");

-- AddForeignKey
ALTER TABLE "LinearConnection" ADD CONSTRAINT "LinearConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMapping" ADD CONSTRAINT "ProjectMapping_linearConnectionId_fkey" FOREIGN KEY ("linearConnectionId") REFERENCES "LinearConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BcfServerConfig" ADD CONSTRAINT "BcfServerConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BcfServerConfig" ADD CONSTRAINT "BcfServerConfig_projectMappingId_fkey" FOREIGN KEY ("projectMappingId") REFERENCES "ProjectMapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSettings" ADD CONSTRAINT "AppSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
