-- AlterTable
ALTER TABLE "GmailCredential" ADD COLUMN     "accessTokenIv" TEXT,
ADD COLUMN     "accessTokenTag" TEXT;
