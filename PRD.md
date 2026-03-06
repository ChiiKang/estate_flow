PRD: Developer Sales OS (Excel + WhatsApp + Booking + Inventory)
1) Product vision

A WhatsApp-first sales and inventory platform for property developers that replaces “Excel + WhatsApp + paper” with a single source of truth, while keeping adoption friction low (import/export + WhatsApp-native workflows).

2) Goals (MVP)

Prevent double-booking with real-time unit locking

Reduce lead leakage with tasks, follow-up scheduling, and WhatsApp logging

Convert paper bookings into structured booking packets (docs + receipts + checklist)

Give management real-time dashboards and exports

Allow smooth transition from Excel (import + export)

3) Non-goals (MVP)

Full buyer portal

Full accounting integration

Complex e-sign (can add later)

Full marketing attribution integrations (Meta/portal APIs)

MLS/IDX listing syndication

4) Personas

Agent: capture lead, follow up in WhatsApp, reserve unit, start booking

Sales Admin: import leads, assign leads, manage data cleanliness

Sales Manager: approve overrides/discounts, monitor team performance

Finance: verify booking fee receipts, track payment statuses

Management: dashboards, pipeline, inventory health

5) Key workflows (MVP)
A. Excel → Leads

Admin imports CSV/XLSX → mapping → dedupe → assign to agents

B. WhatsApp-first follow-up

Agent logs communications (manual log in MVP or integration-ready)

Templates to speed replies

Scheduled next follow-up tasks

C. Inventory lock → Booking packet

Agent reserves unit (lock + expiry) → booking form → receipt upload → document checklist

D. Reporting

Units sold/reserved/available by project/tower

Lead funnel by stage

Agent performance (leads handled, bookings)

MVP Backlog: Epics → User Stories → Acceptance Criteria
Epic 0: Foundations (Auth, RBAC, Audit)
Story 0.1 — Login & org setup

As a user, I can log in and see only my organization’s data.
Acceptance

JWT/session auth works

All queries scoped by org_id

Users cannot access other org data (server-side enforced)

Story 0.2 — RBAC permissions

Roles: ADMIN, MANAGER, AGENT, FINANCE, VIEWER
Acceptance

Agent can only see assigned leads/deals (or team scope if configured)

Manager can see team + approvals

Finance can see payments + booking packets

Admin can configure projects, import/export, user management

Story 0.3 — Audit log (must-have)

Acceptance

Any change to unit status, price, reservation, deal stage, approvals logged

Audit entries include: actor, entity type/id, action, before/after, timestamp

Epic 1: Project & Unit Inventory
Story 1.1 — Create project and units

As admin, I can create a project and import units (CSV) or create manually.
Acceptance

Project: name, location, status, timezone

Units: tower/block, floor, unit_no, type, size, facing, base_price

Unit uniqueness: (project_id, tower, floor, unit_no) is unique

Story 1.2 — Inventory grid view

As agent/manager, I can view units filtered by tower/floor/type/status.
Acceptance

Filter by status/type/price range/tower/floor

Clicking unit opens unit details (status, price, locks, linked deal)

Story 1.3 — Unit status changes

Statuses: AVAILABLE, RESERVED, BOOKED, SOLD, CANCELLED
Acceptance

Only certain transitions allowed (configurable later; hardcode MVP)

Status change is audited

Epic 2: Unit Reservation Lock (anti double-booking)
Story 2.1 — Reserve (lock) a unit

As agent, I can reserve a unit for X minutes while preparing booking.
Acceptance

Reserve creates unit_lock with expires_at

Only one active lock per unit at a time

If locked by another user, show locked-by + expiry

Lock automatically expires (cron/queue job)

Story 2.2 — Convert reservation to booking

As agent, I can convert a reserved unit into a deal/booking.
Acceptance

When deal created, unit becomes RESERVED or BOOKED depending on booking fee status

Lock is released/marked converted

Audit created

Story 2.3 — Manager override

As manager, I can break a lock with a reason.
Acceptance

Override writes approval/audit entry

Previous lock becomes CANCELLED with reason

Epic 3: Lead CRM (Excel bridge)
Story 3.1 — Lead list and lead profile

Acceptance

Lead list supports filters: stage, owner, source, project_interest, tags

Lead profile shows timeline (notes, tasks, messages, status changes)

Story 3.2 — Lead stages

Stages (MVP default):
NEW → CONTACTED → QUALIFIED → SITE_VISIT → UNIT_SELECTED → RESERVED → BOOKED → SPA_SIGNED → LOAN_SUBMITTED → LOAN_APPROVED → SOLD
Acceptance

Stage changes logged

Lead stage change can auto-create a task (optional rule)

Story 3.3 — Excel import

As admin, I can import leads from CSV/XLSX with mapping + dedupe.
Acceptance

Upload file → map columns → preview rows → import

Dedupe by phone OR email (configurable)

Import report: created vs updated vs rejected rows

Story 3.4 — Excel export

Acceptance

Export leads list with current filters to CSV/XLSX

Export includes core fields + stage + owner + last_contacted

Story 3.5 — Lead assignment

Acceptance

Manual assign/unassign

Optional round robin assignment by team (nice-to-have MVP)

Epic 4: Tasks & Follow-ups
Story 4.1 — Create follow-up task

As agent, I can set a follow-up date/time and task type.
Acceptance

Task types: call, WhatsApp, email, site visit, document request

Task due reminders (in-app list; push/email later)

Story 4.2 — Task dashboard

Acceptance

“My tasks today / overdue” view

Mark task as done, log outcome note

Epic 5: WhatsApp-ready Communication Logging

MVP approach: manual logging + templates now; integration hooks ready.

Story 5.1 — Message templates

Acceptance

Admin can create templates (by project)

Agent can insert template into message composer

Variables supported: {{name}}, {{project}}, {{agent_name}}

Story 5.2 — Log WhatsApp interaction

Acceptance

Agent can log “Sent WhatsApp” + paste message content OR choose template

Entry appears in lead timeline with timestamp and user

Story 5.3 — Integration readiness (webhooks table)

Acceptance

Message table supports provider fields: provider, provider_message_id, delivery status

Phone normalization stored (e164_phone) for linking inbound messages later

Epic 6: Booking Packet (paper → structured deal file)
Story 6.1 — Create deal/booking

Acceptance

Deal links: lead_id, buyer_id (or buyer embedded), project_id, unit_id

Deal stage default based on booking flow

Story 6.2 — Booking form (configurable fields v1)

Acceptance

MVP: fixed buyer fields (name, phone, email, IC/passport, address, employment)

Later: dynamic form builder; for MVP you can implement “custom fields JSON”

Story 6.3 — Document checklist + uploads

Acceptance

Project has required doc types (IC, payslip, etc.)

Deal shows checklist with upload slots

Upload stored in object storage and linked to deal/doc type

Doc status: missing/received/verified (verified by finance/admin)

Story 6.4 — Booking fee receipt upload

Acceptance

Upload receipt with amount/date/ref

Finance can mark as verified

When verified, deal can advance to BOOKED and unit can move to BOOKED

Epic 7: Dashboards & Reports
Story 7.1 — Inventory dashboard

Acceptance

Counts: available/reserved/booked/sold by project/tower

“Locks expiring today” list

Story 7.2 — Sales funnel dashboard

Acceptance

Leads per stage

Conversion: site visit → reserved → booked (simple ratios)

Story 7.3 — Agent performance

Acceptance

Leads assigned, contacted count, bookings created, sold count (per date range)

Data Model: PostgreSQL Schema Draft (MVP)
Conventions

UUID primary keys

org_id on almost everything

created_at, updated_at, deleted_at (soft delete optional)

phone stored normalized: phone_raw, phone_e164

Below is a practical schema (you can implement with Prisma/Drizzle/TypeORM).

1) Organizations & Users
orgs

id (uuid pk)

name

created_at

users

id

org_id (fk)

name

email (unique per org)

role (enum)

team_id (nullable)

is_active

created_at

teams

id

org_id

name

created_at

2) Projects & Units
projects

id

org_id

name

location (nullable)

status (enum: active/inactive)

created_at

units

id

org_id

project_id

tower (text)

floor (text or int)

unit_no (text)

unit_type (text) // 2BR, 3BR etc.

size_sqm (numeric, nullable)

facing (text, nullable)

base_price (numeric)

current_price (numeric)

status (enum)

metadata (jsonb) // parking, view, etc.

created_at

unique: (project_id, tower, floor, unit_no)

3) Unit Locks (reservation)
unit_locks

id

org_id

unit_id

locked_by_user_id

deal_id (nullable) // when converted

status enum: ACTIVE, EXPIRED, CANCELLED, CONVERTED

reason (nullable)

expires_at

created_at

Important index/constraint

partial unique index: only 1 ACTIVE lock per unit

e.g. unique (unit_id) where status='ACTIVE'

4) Leads & Buyers
leads

id

org_id

project_id (nullable) // interest

owner_user_id (nullable)

name

phone_raw

phone_e164 (indexed)

email (nullable)

source (nullable) // “Meta Ads”, “Walk-in”

campaign (nullable)

stage (enum)

priority (int default 0)

last_contacted_at (nullable)

next_followup_at (nullable)

tags (text[] or jsonb)

notes (text nullable)

created_at

Dedupe index suggestions:

(org_id, phone_e164) unique where not null (optional)

(org_id, email) unique where not null (optional)

buyers (optional, can be merged into deal in MVP)

id

org_id

name

phone_e164

email

identity_no (IC/passport) nullable

address jsonb nullable

metadata jsonb

created_at

5) Deals (Bookings)
deals

id

org_id

project_id

unit_id (nullable until selected)

lead_id (nullable)

buyer_id (nullable; or store buyer snapshot in JSON)

assigned_user_id (agent)

stage (enum: reserved/booked/spa/loan/sold etc.)

pricing jsonb // breakdown: base, discount, rebate, final

custom_fields jsonb // project-specific fields

created_at

updated_at

6) Documents & Checklist
doc_types

id

org_id

project_id (nullable; if global)

name (e.g., “IC Front”, “Payslip”)

is_required boolean

created_at

deal_docs

id

org_id

deal_id

doc_type_id

file_url

file_name

status enum: RECEIVED, VERIFIED, REJECTED

verified_by_user_id nullable

verified_at nullable

created_at

7) Payments (booking fee first)
payments

id

org_id

deal_id

type enum: BOOKING_FEE, DOWNPAYMENT, PROGRESSIVE

amount numeric

paid_at date nullable

reference_no text nullable

receipt_file_url text nullable

status enum: SUBMITTED, VERIFIED, REJECTED

verified_by_user_id nullable

verified_at nullable

created_at

8) Tasks & Activities
tasks

id

org_id

lead_id nullable

deal_id nullable

assigned_user_id

type enum: CALL, WHATSAPP, EMAIL, SITE_VISIT, DOC_REQUEST

title

due_at

status enum: OPEN, DONE, CANCELLED

completed_at nullable

created_at

activities (timeline feed)

Store everything in one append-only timeline:

id

org_id

entity_type enum: LEAD, DEAL, UNIT

entity_id uuid

type enum: NOTE, STAGE_CHANGE, TASK_CREATED, MSG_LOGGED, DOC_UPLOADED, PAYMENT_SUBMITTED, LOCK_CREATED, LOCK_EXPIRED, OVERRIDE, etc.

data jsonb // before/after, message content, etc.

actor_user_id

created_at

9) Messages (WhatsApp-ready)
messages

id

org_id

lead_id nullable

deal_id nullable

channel enum: WHATSAPP, EMAIL, SMS, CALL_LOG

direction enum: INBOUND, OUTBOUND

from_phone_e164 nullable

to_phone_e164 nullable

content text

template_id nullable

provider text nullable

provider_message_id text nullable

delivery_status enum: QUEUED, SENT, DELIVERED, FAILED, READ (optional)

created_at

message_templates

id

org_id

project_id nullable

name

content text

created_at

10) Approvals (discounts/overrides)
approvals

id

org_id

type enum: DISCOUNT, LOCK_OVERRIDE, PRICE_OVERRIDE

status enum: PENDING, APPROVED, REJECTED

requested_by_user_id

approved_by_user_id nullable

entity_type enum: DEAL, UNIT, LOCK

entity_id

request_data jsonb

decision_data jsonb nullable

created_at

Important engineering notes (so it works in the real world)
1) Unit lock race conditions (must do right)

When reserving a unit:

Use a DB transaction

Insert ACTIVE lock only if no ACTIVE exists

If insert fails due to unique partial index → return “already locked”

Update unit status to RESERVED only when lock created (or keep unit status separate from lock; both are valid)

2) Make audit/timeline the backbone

Anything important should write:

one row in the primary table (units/leads/deals)

one row in activities (append-only)

This makes your UI “timeline view” easy and extremely valuable.

3) Excel import strategy

Import as “upsert”

Keep an import_batch table if you want traceability:

who imported, file name, created/updated counts, errors JSON

Suggested MVP API surface (Node.js)

You can implement this as REST or tRPC. Minimal endpoints:

POST /auth/login

GET /projects, POST /projects

POST /units/import, GET /units

POST /units/:id/lock, POST /locks/:id/cancel

POST /leads/import, GET /leads, GET /leads/:id, PATCH /leads/:id

POST /tasks, PATCH /tasks/:id

POST /deals, GET /deals/:id, PATCH /deals/:id

POST /deals/:id/docs, POST /deals/:id/payments

GET /dashboards/summary