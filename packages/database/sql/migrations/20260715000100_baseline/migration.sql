-- Baseline of the production schema before physical-name migration.
-- On an existing production database, mark this migration applied only after
-- running scripts/db/preflight-migration.ts and taking a verified pg_dump.
CREATE TYPE "BrainSourceType" AS ENUM ('PDF', 'IMAGE', 'FEEDBACK', 'CATALOG', 'TEXT');
CREATE TYPE "TasteSignalType" AS ENUM ('LIKE', 'DISLIKE', 'APPROVE', 'REJECT', 'RATING');
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'COMPLETED');
CREATE TYPE "LogoStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "plan" "Plan" NOT NULL DEFAULT 'FREE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OrganizationMember" (
  "id" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'MEMBER',
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Project" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
  "organizationId" TEXT,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Brand" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "industry" TEXT NOT NULL,
  "organizationId" TEXT,
  "projectId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BrandDNA" (
  "id" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "personality" TEXT,
  "visualTraits" JSONB NOT NULL,
  "psychology" JSONB NOT NULL,
  "principleIds" TEXT[],
  "narrative" TEXT,
  "constraints" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BrandDNA_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Logo" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "brandId" TEXT,
  "projectId" TEXT,
  "status" "LogoStatus" NOT NULL DEFAULT 'DRAFT',
  "svgContent" TEXT,
  "promptText" TEXT,
  "scores" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Logo_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LogoVersion" (
  "id" TEXT NOT NULL,
  "logoId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "svgContent" TEXT,
  "promptText" TEXT,
  "scores" JSONB,
  "changelog" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LogoVersion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PromptRun" (
  "id" TEXT NOT NULL,
  "projectId" TEXT,
  "industry" TEXT NOT NULL,
  "companyName" TEXT,
  "request" JSONB NOT NULL,
  "result" JSONB NOT NULL,
  "bestScore" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromptRun_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ComposedPromptRecord" (
  "id" TEXT NOT NULL,
  "promptRunId" TEXT,
  "industry" TEXT NOT NULL,
  "companyName" TEXT,
  "text" TEXT NOT NULL,
  "scores" JSONB NOT NULL,
  "dna" JSONB NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "selectedPrinciples" JSONB NOT NULL DEFAULT '[]',
  "rank" INTEGER,
  "logos" JSONB NOT NULL DEFAULT '[]',
  "feedback" TEXT,
  "saved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ComposedPromptRecord_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DesignPrinciple" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "promptFragment" TEXT NOT NULL,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "tags" TEXT[],
  "compatibility" TEXT[],
  "antiPatterns" TEXT[],
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DesignPrinciple_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BrainExperience" (
  "id" TEXT NOT NULL,
  "sourceType" "BrainSourceType" NOT NULL,
  "title" TEXT,
  "content" TEXT NOT NULL,
  "summary" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "filePath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BrainExperience_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BrainTasteSignal" (
  "id" TEXT NOT NULL,
  "experienceId" TEXT,
  "signalType" "TasteSignalType" NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "context" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrainTasteSignal_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LearnedPrinciple" (
  "id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "ruleText" TEXT NOT NULL,
  "promptFragment" TEXT NOT NULL,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "sourceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "antiPatterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "citations" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearnedPrinciple_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");
CREATE UNIQUE INDEX "BrandDNA_brandId_key" ON "BrandDNA"("brandId");
CREATE UNIQUE INDEX "LogoVersion_logoId_version_key" ON "LogoVersion"("logoId", "version");
CREATE INDEX "ComposedPromptRecord_promptRunId_idx" ON "ComposedPromptRecord"("promptRunId");
CREATE INDEX "ComposedPromptRecord_createdAt_idx" ON "ComposedPromptRecord"("createdAt");
CREATE INDEX "BrainExperience_createdAt_idx" ON "BrainExperience"("createdAt" DESC);
CREATE INDEX "BrainTasteSignal_createdAt_idx" ON "BrainTasteSignal"("createdAt" DESC);

ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BrandDNA" ADD CONSTRAINT "BrandDNA_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Logo" ADD CONSTRAINT "Logo_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Logo" ADD CONSTRAINT "Logo_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LogoVersion" ADD CONSTRAINT "LogoVersion_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "Logo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromptRun" ADD CONSTRAINT "PromptRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComposedPromptRecord" ADD CONSTRAINT "ComposedPromptRecord_promptRunId_fkey" FOREIGN KEY ("promptRunId") REFERENCES "PromptRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BrainTasteSignal" ADD CONSTRAINT "BrainTasteSignal_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "BrainExperience"("id") ON DELETE SET NULL ON UPDATE CASCADE;
