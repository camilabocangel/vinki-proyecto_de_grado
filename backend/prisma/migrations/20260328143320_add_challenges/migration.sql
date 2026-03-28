-- CreateTable
CREATE TABLE "challenges" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "title_en" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "description_en" VARCHAR(500) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "target" INTEGER NOT NULL,
    "metric" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(50) NOT NULL,
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_participations" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "challenge_id" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_participations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "challenges_is_active_idx" ON "challenges"("is_active");

-- CreateIndex
CREATE INDEX "challenges_end_date_idx" ON "challenges"("end_date");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_participations_user_id_challenge_id_key" ON "challenge_participations"("user_id", "challenge_id");

-- AddForeignKey
ALTER TABLE "challenge_participations" ADD CONSTRAINT "challenge_participations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participations" ADD CONSTRAINT "challenge_participations_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
