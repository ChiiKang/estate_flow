# EstateFlow - Feature Roadmap

## Overview

Five high-impact features to transform EstateFlow from a basic CRUD app into a genuinely useful property sales platform. Ordered by implementation priority.

---

## Feature 1: Interactive Unit Availability Board (Sales Gallery View)

### Problem
Sales agents currently rely on Excel spreadsheets shared via WhatsApp to check unit availability. By the time they open the file, it's already outdated. Double-bookings happen. Buyers get frustrated. Managers have no real-time visibility.

### Solution
A visual, real-time unit availability board that shows every unit in a project color-coded by status. Agents can check availability, reserve units, and show buyers — all from their phone at a sales gallery.

### User Stories
- As a **sales agent**, I want to see all units in a project at a glance so I can quickly tell buyers what's available.
- As a **sales agent**, I want to tap a unit to see its details (price, size, floor, facing) so I can answer buyer questions on the spot.
- As a **sales agent**, I want to reserve a unit directly from the board so I don't lose the deal while fumbling with paperwork.
- As a **manager**, I want to see real-time availability across all projects so I can make pricing and launch decisions.
- As a **admin**, I want to see who reserved/booked each unit and when, so I have a full audit trail.

### UI Design

#### Grid View (Default)
```
┌─────────────────────────────────────────────────┐
│  Project: Maple Residences        [Grid] [List] │
│  Tower A  |  Tower B  |  Tower C                │
├─────────────────────────────────────────────────┤
│                                                 │
│  Floor 20  [ A-20-1 ] [ A-20-2 ] [ A-20-3 ]    │
│  Floor 19  [ A-19-1 ] [ A-19-2 ] [ A-19-3 ]    │
│  Floor 18  [ A-18-1 ] [ A-18-2 ] [ A-18-3 ]    │
│  Floor 17  [ A-17-1 ] [ A-17-2 ] [ A-17-3 ]    │
│  ...                                            │
│  Floor 1   [ A-1-1  ] [ A-1-2  ] [ A-1-3  ]    │
│                                                 │
│  Legend:                                        │
│  [■] Available  [■] Reserved  [■] Booked        │
│  [■] Sold       [■] Cancelled                   │
│                                                 │
│  Summary: 45 Available | 12 Reserved | 8 Booked │
│           15 Sold | 2 Cancelled                 │
└─────────────────────────────────────────────────┘
```

#### Unit Detail Popover (on click)
```
┌────────────────────────────────┐
│  Unit A-18-2                   │
│  Status: ● Available           │
│                                │
│  Type:     3BR + 2BA           │
│  Size:     1,200 sqft          │
│  Floor:    18                  │
│  Facing:   North               │
│  Price:    RM 680,000          │
│  PSF:      RM 567              │
│                                │
│  [ Reserve Unit ]  [ Details ] │
└────────────────────────────────┘
```

### Color Coding
| Status    | Color        | Hex       |
|-----------|--------------|-----------|
| Available | Green        | `#22c55e` |
| Reserved  | Amber/Yellow | `#eab308` |
| Booked    | Blue         | `#3b82f6` |
| Sold      | Gray         | `#6b7280` |
| Cancelled | Red          | `#ef4444` |

### Technical Spec

#### Components
- `UnitBoard.tsx` — Main board layout with project/block selector
- `UnitGrid.tsx` — Grid of unit cells organized by floor and unit number
- `UnitCell.tsx` — Individual unit cell with color, tooltip, click handler
- `UnitDetailPopover.tsx` — Popover with unit info and action buttons
- `UnitBoardFilters.tsx` — Filter by status, type, price range, floor range

#### API Endpoints
- `GET /api/projects/[id]/units/board` — Returns all units for a project, optimized for board view (minimal fields: id, unit_no, block, floor, type, size, price, status)
- `POST /api/units/[id]/lock` — Already exists. Reserve a unit with DB transaction + partial unique index to prevent double-booking.

#### Data Requirements
Units need these fields (most already exist in schema):
- `block` — Tower/block identifier (e.g., "Tower A")
- `floor` — Floor number (integer)
- `unit_number` — Unit identifier within a floor
- `unit_type` — Bedroom/bathroom config
- `built_up_sqft` — Size in square feet
- `facing` — Compass direction
- `selling_price` — Current selling price
- `status` — AVAILABLE, RESERVED, BOOKED, SOLD, CANCELLED

#### Performance
- Single query to load all units for a project (typically 200-800 units)
- No pagination needed — render all units in the grid
- Optimistic UI for status changes with server reconciliation
- Consider polling or SSE for real-time updates across agents

#### Mobile Responsiveness
- Grid scrolls horizontally on mobile
- Unit cells are touch-friendly (min 44px tap target)
- Detail popover becomes a bottom sheet on mobile

---

## Feature 2: Excel Import/Export

### Problem
Property developers live in Excel. Their unit lists, buyer databases, and sales reports are all spreadsheets. If they can't import their existing data and export reports in Excel format, they won't adopt the platform. Period.

### Solution
One-click Excel import and export for all major entities: Projects, Units, Leads, and Deals. Smart column mapping, validation with error reporting, and template downloads.

### User Stories
- As an **admin**, I want to import my existing unit list from Excel so I don't have to manually enter 500 units.
- As an **admin**, I want to download a template Excel file so I know exactly what format to prepare my data in.
- As a **manager**, I want to export my leads list to Excel so I can share it with stakeholders who don't use the platform.
- As an **agent**, I want to import a list of leads from a roadshow sign-up sheet so I can follow up quickly.
- As a **finance** user, I want to export deals and payment data to Excel for reconciliation.

### Import Flow

```
Step 1: Upload                Step 2: Map Columns           Step 3: Validate & Confirm
┌───────────────────┐        ┌──────────────────────────┐  ┌──────────────────────────┐
│                   │        │  Your Column → Our Field  │  │  Validation Results       │
│   Drag & drop     │        │                          │  │                          │
│   your .xlsx or   │   →    │  "Unit No"  → unit_no    │  │  ✓ 480 rows valid        │
│   .csv file here  │        │  "Block"    → block      │  │  ✗ 20 rows have errors   │
│                   │        │  "Floor"    → floor      │  │                          │
│  [Browse Files]   │        │  "Type"     → unit_type  │  │  [Download Error Report] │
│                   │        │  "Price"    → price      │  │  [Import 480 Valid Rows] │
└───────────────────┘        └──────────────────────────┘  └──────────────────────────┘
```

### Import Entities & Fields

#### Units Import
| Excel Column (flexible) | Maps To          | Required | Validation                    |
|--------------------------|------------------|----------|-------------------------------|
| Unit No / Unit Number    | `unit_no`        | Yes      | Unique within project         |
| Block / Tower            | `block`          | No       | Text                          |
| Floor                    | `floor`          | No       | Integer                       |
| Type / Bedroom           | `unit_type`      | No       | Text                          |
| Size / Built-up (sqft)   | `built_up_sqft`  | No       | Positive number               |
| Price / Selling Price     | `selling_price`  | No       | Positive number               |
| Facing                   | `facing`         | No       | Text                          |
| Status                   | `status`         | No       | Must be valid enum value      |

#### Leads Import
| Excel Column (flexible) | Maps To        | Required | Validation                        |
|--------------------------|----------------|----------|-----------------------------------|
| Name                     | `name`         | Yes      | Non-empty text                    |
| Phone / Mobile           | `phone_raw`    | Yes      | Valid phone, auto-normalize E.164 |
| Email                    | `email`        | No       | Valid email format                |
| Source                   | `source`       | No       | Text                              |
| Notes / Remarks          | `notes`        | No       | Text                              |
| Interested Project       | `project_id`   | No       | Match by project name             |

### Export Functionality
- Every table page gets an "Export to Excel" button in the toolbar
- Exports respect current filters and search query
- Exports include all visible columns plus ID for reference
- File naming: `{entity}_{project}_{date}.xlsx` (e.g., `units_maple-residences_2026-03-06.xlsx`)
- Max export: 10,000 rows per file

### Technical Spec

#### Libraries
- **Import**: `xlsx` (SheetJS) for parsing Excel/CSV files client-side
- **Export**: `xlsx` for generating .xlsx files client-side (no server round-trip needed)

#### Components
- `ExcelImportDialog.tsx` — Multi-step import wizard (upload → map → validate → confirm)
- `ColumnMapper.tsx` — Drag-and-drop or dropdown column mapping UI
- `ValidationResults.tsx` — Shows valid/invalid row counts with error details
- `ExcelExportButton.tsx` — Reusable export button component
- `ImportTemplateDownload.tsx` — Download blank template with headers and sample data

#### API Endpoints
- `POST /api/import/units` — Bulk create units from validated import data
- `POST /api/import/leads` — Bulk create leads with deduplication check
- `GET /api/export/units?projectId=X&format=xlsx` — Server-side export (fallback)
- `GET /api/export/leads?projectId=X&format=xlsx` — Server-side export (fallback)

#### Deduplication (Leads)
- On import, check each lead's `phone_e164` and `email` against existing leads in the org
- If duplicate found: flag the row, show the existing lead, let user choose to skip or update
- Summary: "15 new leads, 5 duplicates (skipped), 2 errors"

#### Error Handling
- Row-level errors (e.g., "Row 42: Phone number invalid") collected into a downloadable error report
- Partial import supported — valid rows import, invalid rows are skipped
- Import is wrapped in a transaction — if the batch insert fails, nothing is committed

---

## Feature 3: WhatsApp Message Templates & Quick Send

### Problem
Agents send the same types of messages repeatedly: follow-ups, booking confirmations, payment reminders, site visit invitations. They manually type each message or copy-paste from notes, often forgetting key details or making errors. There's no record of what was sent.

### Solution
Pre-built message templates with variable substitution that generate WhatsApp deep links. Agents select a template, preview the personalized message, and tap to open WhatsApp with the message pre-filled. Every send is logged to the activity timeline.

### User Stories
- As an **agent**, I want to send a follow-up message to a lead with one tap so I can be more productive.
- As an **agent**, I want to personalize messages with buyer and unit details so messages feel tailored.
- As a **manager**, I want to create message templates for my team so messaging is consistent and professional.
- As a **manager**, I want to see a log of all messages sent to a lead so I know the communication history.
- As an **admin**, I want to set up templates with approval workflows so agents don't send unauthorized messages.

### Template Variables
| Variable           | Source       | Example                  |
|--------------------|-------------|--------------------------|
| `{{buyer_name}}`   | Lead         | Ahmad bin Ibrahim         |
| `{{agent_name}}`   | Current user | Sarah                    |
| `{{project_name}}` | Project      | Maple Residences          |
| `{{unit_no}}`      | Unit         | A-18-2                   |
| `{{unit_type}}`    | Unit         | 3BR + 2BA                |
| `{{unit_price}}`   | Unit         | RM 680,000               |
| `{{unit_size}}`    | Unit         | 1,200 sqft               |
| `{{booking_date}}` | Deal         | 15 March 2026            |
| `{{payment_due}}`  | Deal         | RM 34,000 by 30 Mar 2026 |
| `{{company_name}}` | Org          | ABC Development Sdn Bhd  |

### Default Templates

#### 1. New Lead Follow-Up
```
Hi {{buyer_name}}, this is {{agent_name}} from {{company_name}}.

Thank you for your interest in {{project_name}}! I'd love to help you find the perfect unit.

Would you be available for a site visit this week? I can arrange a private tour at your convenience.

Looking forward to hearing from you!
```

#### 2. Site Visit Invitation
```
Hi {{buyer_name}}, following up on our conversation about {{project_name}}.

I'd like to invite you for a site visit to see the show unit and facilities. We have slots available this weekend.

Would Saturday or Sunday work better for you?
```

#### 3. Unit Reservation Confirmation
```
Hi {{buyer_name}}, great news!

Unit {{unit_no}} at {{project_name}} has been reserved for you.

Details:
- Unit: {{unit_no}} ({{unit_type}}, {{unit_size}})
- Price: {{unit_price}}

Please complete the booking within 14 days to secure this unit. Let me know if you have any questions!
```

#### 4. Payment Reminder
```
Hi {{buyer_name}}, this is a friendly reminder regarding your payment for {{project_name}}.

Outstanding: {{payment_due}}

Please arrange the payment at your earliest convenience. Feel free to reach out if you need any assistance.
```

#### 5. Booking Confirmation
```
Hi {{buyer_name}}, congratulations!

Your booking for {{unit_no}} at {{project_name}} is now confirmed.

Next steps:
1. SPA signing appointment will be arranged
2. Loan application (if applicable)

Thank you for choosing {{company_name}}. We're excited to welcome you!
```

### UI Design

#### Template Selection (from Lead/Deal page)
```
┌────────────────────────────────────────────┐
│  Send WhatsApp Message to Ahmad bin Ibrahim │
│                                            │
│  Select Template:                          │
│  ┌──────────────────────────────────────┐  │
│  │ ● New Lead Follow-Up                 │  │
│  │ ○ Site Visit Invitation              │  │
│  │ ○ Unit Reservation Confirmation      │  │
│  │ ○ Payment Reminder                   │  │
│  │ ○ Booking Confirmation               │  │
│  │ ○ Custom Message                     │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  Preview:                                  │
│  ┌──────────────────────────────────────┐  │
│  │ Hi Ahmad, this is Sarah from ABC     │  │
│  │ Development Sdn Bhd.                 │  │
│  │                                      │  │
│  │ Thank you for your interest in       │  │
│  │ Maple Residences! I'd love to help   │  │
│  │ you find the perfect unit...         │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  [Edit Message]  [Send via WhatsApp →]     │
└────────────────────────────────────────────┘
```

### Technical Spec

#### WhatsApp Deep Link
```
https://wa.me/{phone_e164}?text={url_encoded_message}
```
- Opens WhatsApp (mobile app or web) with the message pre-filled
- Agent taps "Send" in WhatsApp to confirm — we never send messages automatically
- Works on both mobile and desktop

#### Components
- `WhatsAppSendDialog.tsx` — Template selection, preview, and send
- `TemplateEditor.tsx` — Create/edit templates with variable insertion
- `TemplatePreview.tsx` — Live preview with variables replaced
- `TemplateManager.tsx` — Admin page to manage org-wide templates

#### Data Model
```prisma
model MessageTemplate {
  id          String   @id @default(uuid())
  org_id      String
  name        String
  body        String   // Template text with {{variables}}
  category    String   // FOLLOW_UP, SITE_VISIT, RESERVATION, PAYMENT, BOOKING, CUSTOM
  is_default  Boolean  @default(false)
  created_by  String
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
  org         Org      @relation(fields: [org_id], references: [id])
}
```

#### API Endpoints
- `GET /api/templates` — List all templates for the org
- `POST /api/templates` — Create a new template
- `PUT /api/templates/[id]` — Update a template
- `DELETE /api/templates/[id]` — Soft delete a template
- `POST /api/messages/send` — Log a sent message to activities (does not actually send — WhatsApp deep link handles sending)

#### Activity Logging
Every "send" logs to the `activities` table:
```json
{
  "type": "WHATSAPP_SENT",
  "entity_type": "lead",
  "entity_id": "lead-uuid",
  "metadata": {
    "template": "New Lead Follow-Up",
    "phone": "+60123456789",
    "message_preview": "Hi Ahmad, this is Sarah from..."
  }
}
```

---

## Feature 4: Lead-to-Deal Pipeline (Kanban Board)

### Problem
Managers have no visibility into where leads are in the sales funnel. Agents track progress in their heads or in personal notes. There's no way to identify bottlenecks, stalled leads, or which agents need help. Weekly sales meetings devolve into "what's the status of Lead X?" conversations.

### Solution
A visual Kanban pipeline board showing leads/deals moving through sales stages. Drag-and-drop to update stages. Each card shows key info at a glance. Click to see the full activity timeline. Filters by agent, project, date range.

### User Stories
- As a **manager**, I want to see all leads in a pipeline view so I can identify bottlenecks and stalled deals.
- As a **manager**, I want to filter the pipeline by agent so I can review individual performance.
- As an **agent**, I want to drag a lead to the next stage so updating status is quick and intuitive.
- As an **agent**, I want to see my pipeline so I know which leads need attention.
- As an **admin**, I want to see conversion rates between stages so I can optimize the sales process.

### Pipeline Stages

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│   NEW    │→ │CONTACTED │→ │QUALIFIED │→ │SITE VISIT│→ │ RESERVED │→ │  BOOKED  │→ ...
│          │  │          │  │          │  │          │  │          │  │          │
│ ┌──────┐ │  │ ┌──────┐ │  │ ┌──────┐ │  │ ┌──────┐ │  │ ┌──────┐ │  │ ┌──────┐ │
│ │Ahmad │ │  │ │Siti  │ │  │ │John  │ │  │ │Mary  │ │  │ │David │ │  │ │Lisa  │ │
│ │Maple │ │  │ │Maple │ │  │ │Oak   │ │  │ │Maple │ │  │ │Oak   │ │  │ │Maple │ │
│ │2 days│ │  │ │5 days│ │  │ │1 week│ │  │ │3 days│ │  │ │1 day │ │  │ │2 days│ │
│ └──────┘ │  │ └──────┘ │  │ └──────┘ │  │ └──────┘ │  │ └──────┘ │  │ └──────┘ │
│ ┌──────┐ │  │ ┌──────┐ │  │          │  │          │  │          │  │          │
│ │Ravi  │ │  │ │Wei   │ │  │          │  │          │  │          │  │          │
│ │Oak   │ │  │ │Maple │ │  │          │  │          │  │          │  │          │
│ │1 day │ │  │ │3 days│ │  │          │  │          │  │          │  │          │
│ └──────┘ │  │ └──────┘ │  │          │  │          │  │          │  │          │
│          │  │          │  │          │  │          │  │          │  │          │
│  (12)    │  │  (8)     │  │  (5)     │  │  (3)     │  │  (4)     │  │  (2)     │
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

### Lead Card Design
```
┌─────────────────────────┐
│ Ahmad bin Ibrahim    ●  │  ← colored dot = lead temperature
│ Maple Residences        │  ← interested project
│ Agent: Sarah            │  ← assigned agent
│ 📞 +6012-345-6789      │  ← phone (tap to call/WhatsApp)
│ ⏱ 2 days in stage       │  ← time in current stage
│ 💰 Est. RM 680,000     │  ← estimated deal value
└─────────────────────────┘
```

### Filters & Views
- **By Agent**: Show only one agent's pipeline (for agent self-view or manager review)
- **By Project**: Show leads interested in a specific project
- **By Date**: Filter by lead creation date or last activity date
- **Stale Leads**: Highlight leads with no activity in X days (configurable, default 7)
- **Hot Leads**: Leads with recent activity or high engagement

### Technical Spec

#### Components
- `PipelineBoard.tsx` — Main Kanban board with horizontal scrolling stages
- `PipelineColumn.tsx` — Single stage column with card list and count
- `PipelineCard.tsx` — Draggable lead card with summary info
- `PipelineFilters.tsx` — Filter bar (agent, project, date, stale)
- `LeadDetailSheet.tsx` — Slide-over panel with full lead details + activity timeline

#### Drag and Drop
- Use `@dnd-kit/core` for accessible, performant drag-and-drop
- On drop: optimistic UI update + API call to update lead stage
- Stage change logs to `activities` table automatically
- Validation: enforce stage order (can't skip stages without manager override)

#### API Endpoints
- `GET /api/leads/pipeline?projectId=X&agentId=Y` — Returns leads grouped by stage with counts
- `PATCH /api/leads/[id]/stage` — Update lead stage (with activity logging)
- `GET /api/leads/[id]/timeline` — Full activity timeline for a lead

#### Stage Transition Rules
| From Stage     | Allowed Next Stages              | Required Fields          |
|----------------|----------------------------------|--------------------------|
| NEW            | CONTACTED, CANCELLED             | —                        |
| CONTACTED      | QUALIFIED, CANCELLED             | —                        |
| QUALIFIED      | SITE_VISIT, CANCELLED            | —                        |
| SITE_VISIT     | UNIT_SELECTED, CANCELLED         | —                        |
| UNIT_SELECTED  | RESERVED, CANCELLED              | unit_id                  |
| RESERVED       | BOOKED, CANCELLED                | booking_fee paid         |
| BOOKED         | SPA_SIGNED, CANCELLED            | deal created             |
| SPA_SIGNED     | LOAN_SUBMITTED, CANCELLED        | spa_date                 |
| LOAN_SUBMITTED | LOAN_APPROVED, CANCELLED         | loan_bank, loan_amount   |
| LOAN_APPROVED  | SOLD                             | loan_approval_date       |

#### Performance
- Load pipeline data in a single aggregated query
- Limit cards per column to 50 (with "Load more" for large datasets)
- Virtual scrolling for columns with many cards
- Debounce drag operations to prevent rapid API calls

---

## Feature 5: Dashboard with Real-Time Sales Analytics

### Problem
Developers and sales managers make decisions based on gut feeling or manually assembled reports. There's no quick way to answer: "How many units are left in Project X?", "Which agent is performing best?", "What's our monthly collection?", or "Where are leads dropping off?"

### Solution
A comprehensive dashboard with key metrics, charts, and insights. Real-time data pulled from the existing database. Filterable by project, date range, and agent.

### User Stories
- As a **manager**, I want to see total sales and collection at a glance so I can report to stakeholders.
- As a **manager**, I want to see agent performance rankings so I can coach underperformers.
- As an **admin**, I want to see project-level sales progress so I can plan launches and marketing.
- As a **finance** user, I want to see payment collection status so I can chase outstanding amounts.
- As an **agent**, I want to see my own performance metrics so I can track my progress.

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard                    Project: [All ▾]  Period: [MTD ▾] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Total    │  │ Units    │  │ Revenue  │  │ Leads    │       │
│  │ Units    │  │ Sold     │  │ (Booked) │  │ This     │       │
│  │ 500      │  │ 127      │  │ RM 86.4M │  │ Month    │       │
│  │          │  │ 25.4%    │  │ +12% MoM │  │ 48       │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
│  ┌─────────────────────────────┐  ┌────────────────────────┐   │
│  │  Sales Trend (12 months)    │  │  Unit Status Breakdown │   │
│  │                             │  │                        │   │
│  │  ▐                          │  │  Available  ████░ 62%  │   │
│  │  ▐▐                    ▐    │  │  Reserved   ██░░░ 12%  │   │
│  │  ▐▐  ▐▐              ▐▐    │  │  Booked     █░░░░  8%  │   │
│  │  ▐▐  ▐▐  ▐▐    ▐▐   ▐▐    │  │  Sold       ██░░░ 15%  │   │
│  │  ▐▐  ▐▐  ▐▐  ▐▐▐▐   ▐▐    │  │  Cancelled  ░░░░░  3%  │   │
│  │  ▐▐▐ ▐▐▐ ▐▐▐ ▐▐▐▐▐  ▐▐▐   │  │                        │   │
│  └─────────────────────────────┘  └────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────┐  ┌────────────────────────┐   │
│  │  Agent Leaderboard          │  │  Conversion Funnel     │   │
│  │                             │  │                        │   │
│  │  1. Sarah    - 15 deals     │  │  Leads:     100 ████   │   │
│  │  2. Ahmad    - 12 deals     │  │  Contacted:  72 ███░   │   │
│  │  3. Wei Lin  - 10 deals     │  │  Qualified:  45 ██░░   │   │
│  │  4. Ravi     -  8 deals     │  │  Site Visit: 28 █░░░   │   │
│  │  5. Siti     -  6 deals     │  │  Reserved:   18 █░░░   │   │
│  │                             │  │  Booked:     12 ░░░░   │   │
│  │  Total team: 51 deals       │  │  Sold:        8 ░░░░   │   │
│  └─────────────────────────────┘  └────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Collection Tracker                                       │  │
│  │                                                           │  │
│  │  Total Expected:  RM 86,400,000                           │  │
│  │  Collected:       RM 52,100,000  (60.3%)                  │  │
│  │  Outstanding:     RM 34,300,000                           │  │
│  │  Overdue:         RM  8,200,000  (9.5%)  ⚠️              │  │
│  │  ███████████████████████████░░░░░░░░░░░░░                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Metrics Breakdown

#### KPI Cards (Top Row)
| Metric          | Calculation                                      | Comparison       |
|-----------------|--------------------------------------------------|------------------|
| Total Units     | Count of all units in selected project(s)        | —                |
| Units Sold      | Count where status = BOOKED or SOLD              | % of total       |
| Revenue         | Sum of `selling_price` for booked/sold units      | Month-over-month |
| Leads This Month| Count of leads created in current month           | vs. last month   |

#### Sales Trend Chart
- Monthly bar chart showing number of bookings/sales per month
- 12-month rolling window
- Stacked by project if "All Projects" selected

#### Unit Status Breakdown
- Donut or horizontal bar chart
- Shows distribution: Available, Reserved, Booked, Sold, Cancelled
- Filterable by project

#### Agent Leaderboard
- Ranked by number of deals closed in the selected period
- Shows: agent name, deals closed, total deal value
- Clickable to see agent's pipeline
- Agents see only their own stats (unless manager/admin)

#### Conversion Funnel
- Shows lead count at each pipeline stage
- Calculates drop-off rate between stages
- Highlights the biggest drop-off point
- Helps identify where the sales process needs improvement

#### Collection Tracker
- Total expected revenue vs. collected vs. outstanding
- Highlights overdue payments (past due date)
- Progress bar visualization
- Drilldown to see individual overdue payments

### Technical Spec

#### Components
- `DashboardPage.tsx` — Main dashboard layout with filter bar
- `KpiCards.tsx` — Top row of summary metric cards
- `SalesTrendChart.tsx` — Monthly sales bar chart (use Recharts)
- `UnitStatusChart.tsx` — Donut chart for unit status distribution
- `AgentLeaderboard.tsx` — Ranked agent performance table
- `ConversionFunnel.tsx` — Pipeline stage funnel visualization
- `CollectionTracker.tsx` — Revenue collection progress

#### Chart Library
- **Recharts** — Lightweight, React-native charting library
- Responsive, works well on mobile
- Supports bar, line, pie/donut, and funnel charts

#### API Endpoints
- `GET /api/dashboard/summary` — Already exists (enhance with more metrics)
- `GET /api/dashboard/sales-trend?months=12` — Monthly sales data
- `GET /api/dashboard/unit-status?projectId=X` — Unit status distribution
- `GET /api/dashboard/agent-leaderboard?period=MTD` — Agent rankings
- `GET /api/dashboard/funnel?projectId=X` — Lead stage counts for funnel
- `GET /api/dashboard/collections?projectId=X` — Payment collection summary

#### Caching Strategy
- Dashboard queries can be expensive — cache results for 5 minutes
- Use `revalidate` in Next.js or a simple in-memory cache
- Real-time accuracy is not critical for dashboard — slight delay is acceptable

#### Role-Based Views
| Role    | Sees                                                |
|---------|-----------------------------------------------------|
| ADMIN   | All metrics, all projects, all agents               |
| MANAGER | All metrics for their projects, all agents           |
| AGENT   | Own metrics only, own leads/deals                   |
| FINANCE | Collection tracker, revenue metrics                  |
| VIEWER  | Read-only view of all available metrics             |

---

## Implementation Priority

| Priority | Feature                    | Effort   | Impact   | Dependencies        |
|----------|----------------------------|----------|----------|---------------------|
| 1        | Unit Availability Board    | Medium   | Very High| Units data exists   |
| 2        | Excel Import/Export        | Medium   | Very High| None                |
| 3        | WhatsApp Templates         | Low-Med  | High     | Leads data exists   |
| 4        | Pipeline Kanban Board      | Medium   | High     | Leads data exists   |
| 5        | Sales Analytics Dashboard  | Medium   | High     | All data exists     |

### Estimated Build Order
1. **Week 1-2**: Unit Availability Board — the "wow" feature
2. **Week 2-3**: Excel Import/Export — removes adoption barrier
3. **Week 3-4**: WhatsApp Templates — delivers on core value prop
4. **Week 4-5**: Pipeline Kanban Board — adds operational value
5. **Week 5-6**: Sales Analytics Dashboard — enables data-driven decisions

---

## Technical Dependencies (Shared)

### New npm Packages
- `xlsx` — Excel file parsing and generation
- `@dnd-kit/core` + `@dnd-kit/sortable` — Drag and drop for Kanban
- `recharts` — Charting library for dashboard
- `libphonenumber-js` — Already installed for phone normalization

### Prisma Schema Additions
- `MessageTemplate` model (for WhatsApp templates)
- Potentially new fields on `Unit` model (block, floor, facing if not present)

### Shared Components
- `EmptyState.tsx` — Consistent empty state illustrations
- `FilterBar.tsx` — Reusable filter component (project, agent, date range)
- `StatusBadge.tsx` — Colored status badges used across features
