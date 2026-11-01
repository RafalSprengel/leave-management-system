<img width="1442" height="1710" alt="Zrzut ekranu 2026-10-17 232742" src="https://github.com/user-attachments/assets/72a75324-cec4-4df3-b0d7-763a56624c7b" />
<img width="1327" height="1054" alt="Zrzut ekranu 2026-08-20 190240" src="https://github.com/user-attachments/assets/98550e69-ca49-4c3e-b878-27b8c33c1b11" />
<img width="1320" height="1053" alt="Zrzut ekranu 2026-08-20 190539" src="https://github.com/user-attachments/assets/1951f905-bf6d-4c1c-a276-3d51bf10ab57" />
<img width="1319" height="1055" alt="Zrzut ekranu 2026-08-20 190309" src="https://github.com/user-attachments/assets/11bcf93d-5174-489e-bc71-0c48879697ef" />

# Off Work — Leave Management & Absence Tracking (SaaS)

🌐 **Live Demo:** [off-work.rafalsprengel.com](https://off-work.rafalsprengel.com)

**Off Work** is a multi-tenant SaaS platform that lets companies create an account and manage their employees' holidays, leave requests and absences. Each company signs up as its own organization (tenant) and manages its own employees, departments, holiday policies, leave allowances and leave requests, fully isolated from other tenants.

Beyond the basics (request → approve → track balance), Off Work handles the messy real-world details most leave tools skip: **absences that override leave**, **cancellation approval workflow**, **per-type allowances**, **configurable holiday year**, **timezone-aware "today"**, **UK bank-holiday import**, and a **team-availability view right inside the approval screen**.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [What Makes It Different](#-what-makes-it-different)
- [Roles & Permissions](#-roles--permissions)
- [Leave Request Lifecycle](#-leave-request-lifecycle)
- [Tech Stack](#️-tech-stack)
- [Architecture](#️-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Roadmap](#️-roadmap)

---

## ✨ Key Features

### 🏢 Multi-tenancy & Onboarding
- **Multi-tenant architecture** — every company operates as an isolated organization, with its own employees, departments, settings, closure days and leave data. Every database query is scoped by `organizationId`.
- **Self-service onboarding** — sign up → verify email → create your organization. The creator becomes the organization **owner** and a default *Administration* department is created automatically.
- **Invitation flow** — managers add an employee and a branded invitation email (valid for 7 days) is sent. The invitee lands on a pre-filled registration page, sets a password and is activated and signed in automatically. Because the invitation already proves ownership of the email address, the redundant "confirm your email" step is skipped (only when a matching pending invitation really exists).
- **Resend invitation**, password reset sent by a manager, and self-service password change.

### 👤 Employee Management
- Full employee lifecycle: **invited → active → inactive**.
- **Deactivate / reactivate** instead of deleting — historical data stays linked; a reactivation email is sent. Deactivation also cancels any pending invitation.
- Owner protection — the organization owner cannot be deactivated, deleted or demoted.
- Role and email changes stay in sync with the authentication layer.
- Search, sorting, pagination, and responsive table/card layouts.
- **Employee detail page** with tabs: *Profile*, *Leaves*, *Calendar*, *Allowances*, *Stats*.

### 🏬 Departments
- Organize employees into departments with **multiple managers per department**.
- Employee counts per department; manager pickers show which departments a manager already leads.

### 🌴 Leave Management
- Leave types: **Holiday, Sick, Unpaid leave, Bereavement** — each with its own allowance.
- **Per-type allowances** per employee, with **organization-wide defaults** pre-filled when adding a new employee.
- Employees can submit, view, filter, sort and cancel their own requests; managers review them from a table, a dashboard, a notification bell, or a detail page.
- Managers can also **create leave on behalf of an employee** (auto-approved, with half-day support for the first/last day).
- **Cancellation workflow** — an employee can request cancellation of an already-approved leave (before it starts); the manager accepts (days returned to the balance) or rejects it (with an optional reason).
- **Rejection reasons**, reviewer audit trail ("Approved by … at …"), and "Created by" information.
- Live balance on the request form: remaining vs. pending days.

### 🚫 Absences
- Managers record **Sick**, **Unauthorised** and **Other** absences for any employee.
- Overlapping absences for the same employee are blocked; weekends and non-working days can't be recorded.
- Warns when an absence overlaps with already-approved holiday (see [absence priority](#-what-makes-it-different)).

### 📅 Calendars
- **Personal calendar** (`/me/calendar`) — your approved leave, colleagues from your department, and closure days, with an "Upcoming Team Leave" list for the next 7 days.
- **Team calendar** (`/team/calendar`) — week / month / year views, filters by department and leave type, bank holidays and closures overlaid, past leave greyed out, multi-day leave split into continuous working-day segments (no bars running through weekends).
- **Per-employee calendar** with yearly overview.

### 📊 Dashboards, Reports & Stats
- **Manager dashboard** — total employees, who is off today (leave vs. sick), pending requests with one-click approve/reject, who is off this week, absences by department, today's and upcoming absences.
- **Employee dashboard** — holiday usage, sick days, additional absence breakdown (unauthorised / unpaid / bereavement / other), pending approvals, team absences.
- **Reports & Analytics** — leave per month by type, sick leave by weekday, sick leave by department, "most annual leave left to take", tenure ranking, most sick leave taken. All tables are sortable and paginated.
- **Employee stats** — annual leave usage, sick days per month and per weekday (12-month window).

### 🗓️ Closure Days & Bank Holidays
- **One-click import of UK bank holidays** from the official gov.uk feed (England & Wales / Scotland / Northern Ireland) — duplicates are skipped automatically.
- Add **custom company/factory closure days**, enable/disable or remove any of them.
- Non-working days are excluded from every leave calculation, and can't be selected in date pickers.

### ⚙️ Organization Settings
- **General** — company name, address, website, **time zone**, and **holiday year start** (e.g. April 1st).
- **Leave policies** — default allowances per leave type (carry-over and sick-leave auto-approval options are visible as "coming soon").
- **Public holidays** and **Factory closures** management.

### 🔔 Notifications
- In-app **notification bell** for managers with pending requests (popover on desktop, drawer on mobile).
- **Transactional emails** (via Resend): invitation, email verification, password reset, account reactivation, and every step of the leave lifecycle — new request, approved, rejected, cancelled (by employee or manager), cancellation requested / accepted / declined.

### 🎨 UX
- Fully responsive (desktop table ↔ mobile card layouts), light/dark mode, public marketing landing page.

---

## 🧠 What Makes It Different

These are the details that go beyond a typical leave-management tool:

| Feature | What it does |
|---|---|
| **Absence overrides leave** | If an employee is recorded as sick (or otherwise absent) during approved holiday, those working days are **not deducted** from the holiday balance. Requests show e.g. `5 (2 covered by absence)`. |
| **Team availability inside the approval screen** | The leave request detail page shows a resource-style timeline of teammates' approved leave around the requested dates, so managers see conflicts before deciding. |
| **Cancellation approval workflow** | Approved leave can't just vanish — cancelling it goes through the manager, with notifications and a full audit trail. |
| **Derived, always-correct day counts** | Day counts are never stored; they are calculated on read from the request period, half-day flags and the *current* weekends / bank holidays / closures. Adding a closure day instantly corrects every calculation. |
| **Configurable holiday year** | Balances are computed per billing period starting on any `MM-DD` (not only January 1st). Requests spanning two holiday years are rejected with a clear message. |
| **Pending-aware balance checks** | Balance validation accounts for already-pending requests, so employees can't over-book. |
| **Timezone-aware "today"** | "Today", "this week" and "can I still cancel?" are evaluated in the organization's own time zone. |
| **Race-condition-safe reviews** | Approve / reject / cancellation decisions use atomic conditional updates, so two managers can't process the same request twice (and duplicate emails are never sent). |
| **Half-day support** | First/last day of a request can be a half day (0.5), handled consistently across balances, calendars and emails. |
| **Official UK bank holidays** | Imported straight from the gov.uk feed, per UK region. |
| **Rollback on failure** | If creating an invitation fails, the half-created employee and allowances are rolled back — no dangling "invited" records. |

---

## 👥 Roles & Permissions

The platform is designed around the following roles:

| Role | Scope |
|------|-------|
| **System Admin** | Platform-level administration across all tenant organizations |
| **Owner** | Full control over a single company's account, billing, and settings |
| **HR** | Manages employees, departments, and leave policies across the organization |
| **Manager** | Manages their own team's employees and leave requests |
| **Employee** | Submits and tracks their own leave requests |

> **Current implementation status:** the data model currently supports the **Manager** and **Employee** roles end-to-end (route groups `(app)/me` for employees and `(app)/team` for managers/HR-level views). The organization **owner** is already recognised (the creator of the organization gets manager-level access and is protected from deactivation, deletion and demotion), but dedicated Owner capabilities such as billing are still to come. Support for the **HR** and **System Admin** roles is on the roadmap as the permission model is extended.

---

## 🔁 Leave Request Lifecycle

```
                 ┌───────────── rejected
                 │
 pending ────────┼───────────── cancelled   (employee cancels before approval)
                 │
                 └─ approved ──┬─ cancelled                 (manager cancels before start date)
                               │
                               └─ cancellation_requested ─┬─ cancelled   (manager accepts)
                                                          └─ approved    (manager rejects)
```

On approval the system checks for **overlap with already-approved leave** and for **sufficient remaining balance** for the leave type.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router, Server Actions)
- **Language:** TypeScript
- **UI:** Mantine (core, dates, schedule, charts, forms, modals, notifications) + Tabler Icons
- **Database:** MongoDB with Mongoose
- **Authentication:** Better Auth (email/password, email verification, `organization` and `admin` plugins for multi-tenancy)
- **Email:** Resend (HTML templates)
- **Dates:** Day.js
- **Charts:** Mantine Charts (built on Recharts)
- **Linting/formatting:** Biome

---

## 🏗️ Architecture

- **Multi-tenancy** is handled through Better Auth's `organization` plugin, which is the source of truth for tenants (organizations, members, invitations). The `Employee` collection acts as an HR profile linked 1:1 to a Better Auth user via `userId`, and is scoped to a tenant via `organizationId`. A hook creates/activates the matching `Employee` profile whenever someone becomes an organization member.
- **Layered security model:**
  1. `proxy.ts` (Next.js 16 request proxy) validates the session via Better Auth before a request reaches `/me/*` or `/team/*`, redirecting to `/sign-in` otherwise.
  2. Layouts re-verify the session and role server-side (e.g. employees are redirected away from `/team`).
  3. **Every server action re-checks the caller's role** (`getCurrentEmployeeRole`) and scopes every query by `organizationId` — the UI is never the only line of defence.
  4. Extra hardening: open-redirect protection, HTML-escaped email templates, and validated invitation headers.
- **Server actions split by audience:** `admin`, `manager`, `employee`, `public`, `shared`.
- **Pure business-logic utilities** (no DB access) for working days, leave balance, billing period and date-range rules, kept separate from the data-fetching layer so they can be reused on both server and client.
- **Route groups:**
  - `(app)/me` — the employee-facing area (dashboard, personal calendar, personal leave requests).
  - `(app)/team` — the manager/HR-facing area (dashboard, calendar, leave requests, absences, reports, employees, departments, settings).
  - `(auth)` — sign in, sign up, reset password, accept invitation.
  - `(marketing)` — the public-facing marketing site.

**Data model (Mongoose):** `Employee`, `Department`, `LeaveRequest`, `LeaveAllowance`, `Absence`, `ClosureDay`, `OrganizationSettings`.

---

## 📁 Project Structure

```
src/
  actions/            # Server actions, split by audience
    admin/            #   absences, closureDays, departments, employees, leave, leaveAllowances, settings
    employee/         #   own leave requests, balance, absence stats
    manager/          #   employees, leave overview, reports, dashboard
    public/           #   invitation flow, roles
    shared/           #   current employee / role helpers
  app/
    (app)/
      me/             # Employee-facing pages (dashboard, calendar, leave requests)
      team/           # Manager-facing pages (dashboard, calendar, leave requests,
                      #   absences, reports, employees, departments, settings)
      onboarding/     # Organization creation after first sign-up
      profile/        # Own profile + change password
    (auth)/           # Sign in / sign up / reset password / accept invitation
    (marketing)/      # Public marketing pages
    api/auth/         # Better Auth route handler
    verify-email/     # Email verification endpoint + callback
  constants/          # Leave types, allowance types, time zones
  db/
    models/           # Mongoose models
    connection.ts     # Cached MongoDB connection helper
  hooks/              # Client-side data hooks
  lib/
    emails/           # Email templates (auth, invitation, leave lifecycle)
    auth.ts           # Better Auth server setup (organization + admin plugins)
    auth-client.ts    # Better Auth client
    sendEmail.ts      # Resend wrapper
    session.ts        # Cached session helpers
  theme/              # Mantine theme configuration
  types/              # Shared TypeScript types
  utils/              # Working-day engine, leave balance & rules, billing period,
                      #   timezone helpers, date-range rules, sorting, safe redirect
  proxy.ts            # Route protection for /me and /team
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js
- A MongoDB instance (local or hosted, e.g. MongoDB Atlas)
- A Resend account for transactional email *(optional in development — without `RESEND_API_KEY`, emails are printed to the server console instead of being sent)*

### Environment Variables

Create a `.env.local` file in the project root with:

```env
MONGODB_URI=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
NEXT_PUBLIC_BETTER_AUTH_URL=
RESEND_API_KEY=
EMAIL_FROM=
```

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### First Run

1. Open `/sign-up` and create an account, then verify your email.
2. Create your organization on the onboarding page — you become the owner/manager.
3. In **Settings → General** set your time zone and holiday year start.
4. In **Settings → Public Holidays** import UK bank holidays; in **Settings → Leave Policies** adjust default allowances.
5. Add departments and employees — invitations are emailed automatically.

### Other Scripts

```bash
npm run build    # Production build
npm run start    # Start the production server
npm run lint     # Lint with Biome
npm run format   # Format with Biome
```

---

## 🗺️ Roadmap

- [ ] Implement Owner, HR, and System Admin roles and permissions
- [ ] Organization-level billing/subscription management
- [ ] Extended leave policy configuration (accrual rules, carry-over, approval workflows)
- [ ] Notifications dropdown enhancements
