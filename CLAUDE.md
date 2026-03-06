# EstateFlow

WhatsApp-first sales and inventory platform for property developers. Replaces "Excel + WhatsApp + paper" with a single source of truth.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes / tRPC
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: JWT/session-based, scoped by `org_id`
- **Storage**: S3-compatible object storage for document uploads
- **Runtime**: Node.js 20+

## Project Structure

```
src/
  app/           # Next.js App Router pages
  components/    # React components (shadcn/ui based)
  lib/           # Shared utilities, db client, auth helpers
  server/        # Server-side logic, tRPC routers or API handlers
prisma/
  schema.prisma  # Database schema
```

## Key Conventions

- UUID primary keys on all tables
- `org_id` on nearly every table — all queries must be scoped by org
- Soft delete via `deleted_at` where applicable
- Phone numbers stored as `phone_raw` + `phone_e164` (normalized)
- Timestamps: `created_at`, `updated_at` on all tables
- Audit trail: all important state changes write to the `activities` table (append-only timeline)

## Roles (RBAC)

ADMIN, MANAGER, AGENT, FINANCE, VIEWER — enforce server-side, never trust client

## Critical Business Rules

- **Unit locks**: Use DB transactions + partial unique index to prevent double-booking. Only one ACTIVE lock per unit at a time.
- **Lead dedupe**: By `phone_e164` or `email` within an org
- **Unit status flow**: AVAILABLE → RESERVED → BOOKED → SOLD (+ CANCELLED)
- **Lead stages**: NEW → CONTACTED → QUALIFIED → SITE_VISIT → UNIT_SELECTED → RESERVED → BOOKED → SPA_SIGNED → LOAN_SUBMITTED → LOAN_APPROVED → SOLD

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run lint       # Lint
npx prisma migrate dev   # Run migrations
npx prisma generate      # Generate Prisma client
```

## Guidelines

- Keep adoption friction low — support Excel import/export everywhere
- WhatsApp-native workflows: templates with variables like `{{name}}`, `{{project}}`, `{{agent_name}}`
- Timeline/activity feed is the backbone — every important action logs to `activities`
- MVP-first: don't over-engineer. Skip buyer portal, full accounting, e-sign, MLS syndication for now.
