-- CreateIndex
CREATE INDEX "deals_org_id_stage_idx" ON "deals"("org_id", "stage");

-- CreateIndex
CREATE INDEX "deals_org_id_created_at_idx" ON "deals"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "leads_org_id_stage_idx" ON "leads"("org_id", "stage");

-- CreateIndex
CREATE INDEX "leads_org_id_deleted_at_idx" ON "leads"("org_id", "deleted_at");

-- CreateIndex
CREATE INDEX "unit_locks_org_id_status_expires_at_idx" ON "unit_locks"("org_id", "status", "expires_at");

-- CreateIndex
CREATE INDEX "units_org_id_status_idx" ON "units"("org_id", "status");
