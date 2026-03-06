-- AlterTable
ALTER TABLE "units" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "unit_notes" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favorites" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,

    CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "unit_notes_unit_id_created_at_idx" ON "unit_notes"("unit_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorites_user_id_unit_id_key" ON "user_favorites"("user_id", "unit_id");

-- CreateIndex
CREATE INDEX "units_org_id_deleted_at_idx" ON "units"("org_id", "deleted_at");

-- AddForeignKey
ALTER TABLE "unit_notes" ADD CONSTRAINT "unit_notes_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_notes" ADD CONSTRAINT "unit_notes_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_notes" ADD CONSTRAINT "unit_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
