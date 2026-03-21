-- DropIndex
DROP INDEX "idx_questions_embedding_hnsw";

-- AlterTable
ALTER TABLE "answer_evaluations" ADD COLUMN     "junior_answer" TEXT,
ADD COLUMN     "mid_answer" TEXT,
ADD COLUMN     "senior_answer" TEXT;
