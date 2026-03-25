-- CreateTable
CREATE TABLE "role_languages" (
    "role_id" INTEGER NOT NULL,
    "language_id" INTEGER NOT NULL,

    CONSTRAINT "role_languages_pkey" PRIMARY KEY ("role_id","language_id")
);

-- AddForeignKey
ALTER TABLE "role_languages" ADD CONSTRAINT "role_languages_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_languages" ADD CONSTRAINT "role_languages_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
