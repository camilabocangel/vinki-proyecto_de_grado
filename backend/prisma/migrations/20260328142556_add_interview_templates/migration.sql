-- CreateTable
CREATE TABLE "interview_templates" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "company_type" VARCHAR(100) NOT NULL,
    "role_id" INTEGER NOT NULL,
    "level_id" INTEGER NOT NULL,
    "language_id" INTEGER,
    "framework_id" INTEGER,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_questions" (
    "id" SERIAL NOT NULL,
    "template_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "order_number" INTEGER NOT NULL,

    CONSTRAINT "template_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interview_templates_created_by_id_idx" ON "interview_templates"("created_by_id");

-- CreateIndex
CREATE INDEX "interview_templates_is_public_idx" ON "interview_templates"("is_public");

-- CreateIndex
CREATE INDEX "template_questions_template_id_idx" ON "template_questions"("template_id");

-- AddForeignKey
ALTER TABLE "interview_templates" ADD CONSTRAINT "interview_templates_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_templates" ADD CONSTRAINT "interview_templates_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_templates" ADD CONSTRAINT "interview_templates_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_templates" ADD CONSTRAINT "interview_templates_framework_id_fkey" FOREIGN KEY ("framework_id") REFERENCES "frameworks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_templates" ADD CONSTRAINT "interview_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_questions" ADD CONSTRAINT "template_questions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "interview_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_questions" ADD CONSTRAINT "template_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
