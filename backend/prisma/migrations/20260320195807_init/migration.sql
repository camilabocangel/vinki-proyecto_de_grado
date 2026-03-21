-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('student', 'recruiter', 'admin');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'student',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "languages" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frameworks" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "language_id" INTEGER NOT NULL,

    CONSTRAINT "frameworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "levels" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,

    CONSTRAINT "levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" SERIAL NOT NULL,
    "question_text" TEXT NOT NULL,
    "type" VARCHAR(80) NOT NULL,
    "source" VARCHAR(120),
    "language_id" INTEGER NOT NULL,
    "framework_id" INTEGER,
    "level_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "embedding" vector(1536),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "language_id" INTEGER,
    "framework_id" INTEGER,
    "chosen_level_id" INTEGER NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ,
    "evaluation_status" "EvaluationStatus" NOT NULL DEFAULT 'pending',
    "evaluation_notification_seen" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_questions" (
    "id" SERIAL NOT NULL,
    "interview_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "question_text_snapshot" TEXT NOT NULL,
    "order_number" INTEGER NOT NULL,
    "generated_by_ai" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "interview_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "id" SERIAL NOT NULL,
    "interview_question_id" INTEGER NOT NULL,
    "answer_text" TEXT,
    "audio_url" VARCHAR(500),
    "answered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_evaluations" (
    "id" SERIAL NOT NULL,
    "answer_id" INTEGER NOT NULL,
    "technical_correctness" REAL,
    "clarity_of_explanation" REAL,
    "communication" REAL,
    "confidence" REAL,
    "problem_solving" REAL,
    "detected_level_id" INTEGER,
    "feedback_text" TEXT,
    "evaluated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answer_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_skill_scores" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "score" REAL NOT NULL,
    "last_updated" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_skill_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiter_notes" (
    "id" SERIAL NOT NULL,
    "recruiter_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "interview_id" INTEGER,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruiter_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "languages_name_key" ON "languages"("name");

-- CreateIndex
CREATE INDEX "frameworks_language_id_idx" ON "frameworks"("language_id");

-- CreateIndex
CREATE UNIQUE INDEX "levels_name_key" ON "levels"("name");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE INDEX "questions_language_id_idx" ON "questions"("language_id");

-- CreateIndex
CREATE INDEX "questions_framework_id_idx" ON "questions"("framework_id");

-- CreateIndex
CREATE INDEX "questions_level_id_idx" ON "questions"("level_id");

-- CreateIndex
CREATE INDEX "questions_skill_id_idx" ON "questions"("skill_id");

-- CreateIndex
CREATE INDEX "interviews_user_id_idx" ON "interviews"("user_id");

-- CreateIndex
CREATE INDEX "interview_questions_interview_id_idx" ON "interview_questions"("interview_id");

-- CreateIndex
CREATE INDEX "answers_interview_question_id_idx" ON "answers"("interview_question_id");

-- CreateIndex
CREATE UNIQUE INDEX "answer_evaluations_answer_id_key" ON "answer_evaluations"("answer_id");

-- CreateIndex
CREATE INDEX "answer_evaluations_answer_id_idx" ON "answer_evaluations"("answer_id");

-- CreateIndex
CREATE INDEX "user_skill_scores_user_id_idx" ON "user_skill_scores"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_skill_scores_user_id_skill_id_key" ON "user_skill_scores"("user_id", "skill_id");

-- AddForeignKey
ALTER TABLE "frameworks" ADD CONSTRAINT "frameworks_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_framework_id_fkey" FOREIGN KEY ("framework_id") REFERENCES "frameworks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_framework_id_fkey" FOREIGN KEY ("framework_id") REFERENCES "frameworks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_chosen_level_id_fkey" FOREIGN KEY ("chosen_level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_interview_question_id_fkey" FOREIGN KEY ("interview_question_id") REFERENCES "interview_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_evaluations" ADD CONSTRAINT "answer_evaluations_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_evaluations" ADD CONSTRAINT "answer_evaluations_detected_level_id_fkey" FOREIGN KEY ("detected_level_id") REFERENCES "levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skill_scores" ADD CONSTRAINT "user_skill_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skill_scores" ADD CONSTRAINT "user_skill_scores_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_notes" ADD CONSTRAINT "recruiter_notes_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_notes" ADD CONSTRAINT "recruiter_notes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
