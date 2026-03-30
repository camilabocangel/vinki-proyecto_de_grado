-- AlterTable: Add uploaded_by_id with default to admin user for existing rows
ALTER TABLE "knowledge_documents" ADD COLUMN "uploaded_by_id" INTEGER;

-- Set existing rows to admin user (id from users where role='admin')
UPDATE "knowledge_documents" SET "uploaded_by_id" = (SELECT id FROM "users" WHERE role = 'admin' LIMIT 1);

-- Make column NOT NULL after populating
ALTER TABLE "knowledge_documents" ALTER COLUMN "uploaded_by_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "knowledge_documents_uploaded_by_id_idx" ON "knowledge_documents"("uploaded_by_id");

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
