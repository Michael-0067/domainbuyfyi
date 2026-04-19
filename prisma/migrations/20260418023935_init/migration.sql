-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "asin" TEXT,
    "slug" TEXT NOT NULL,
    "canonicalSourceUrl" TEXT,
    "productName" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT,
    "shortDescription" TEXT,
    "normalizedAttributes" JSONB NOT NULL,
    "rawSourcePayload" JSONB,
    "imageUrls" JSONB,
    "priceData" JSONB,
    "reviewSummaryData" JSONB,
    "generatedPageData" JSONB,
    "briefContent" TEXT,
    "pageStatus" TEXT NOT NULL DEFAULT 'pending',
    "lastGeneratedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Roundup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "introText" TEXT,
    "closingText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publishedAt" DATETIME
);

-- CreateTable
CREATE TABLE "RoundupItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roundupId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "generatedSummary" TEXT,
    "titleSnapshot" TEXT NOT NULL,
    "priceSnapshot" TEXT,
    "categorySnapshot" TEXT,
    "thumbSnapshot" TEXT,
    "briefUrl" TEXT NOT NULL,
    "amazonUrl" TEXT,
    CONSTRAINT "RoundupItem_roundupId_fkey" FOREIGN KEY ("roundupId") REFERENCES "Roundup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoundupItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Comparison" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canonicalKey" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "productIds" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ComparisonProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "comparisonId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "ComparisonProduct_comparisonId_fkey" FOREIGN KEY ("comparisonId") REFERENCES "Comparison" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ComparisonProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_asin_key" ON "Product"("asin");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Roundup_slug_key" ON "Roundup"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RoundupItem_roundupId_productId_key" ON "RoundupItem"("roundupId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Comparison_canonicalKey_key" ON "Comparison"("canonicalKey");

-- CreateIndex
CREATE UNIQUE INDEX "Comparison_slug_key" ON "Comparison"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ComparisonProduct_comparisonId_productId_key" ON "ComparisonProduct"("comparisonId", "productId");
