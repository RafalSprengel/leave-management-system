<img width="1442" height="1710" alt="Zrzut ekranu 2026-10-17 232742" src="https://github.com/user-attachments/assets/72a75324-cec4-4df3-b0d7-763a56624c7b" />
<img width="1327" height="1054" alt="Zrzut ekranu 2026-08-20 190240" src="https://github.com/user-attachments/assets/98550e69-ca49-4c3e-b878-27b8c33c1b11" />
<img width="1320" height="1053" alt="Zrzut ekranu 2026-08-20 190539" src="https://github.com/user-attachments/assets/1951f905-bf6d-4c1c-a276-3d51bf10ab57" />
<img width="1319" height="1055" alt="Zrzut ekranu 2026-08-20 190309" src="https://github.com/user-attachments/assets/11bcf93d-5174-489e-bc71-0c48879697ef" />

### Off Work — Leave Management & Absence Tracking (SaaS)

## 🌐 **Live Demo:** [off-work.rafalsprengel.com](http://off-work.rafalsprengel.com/)

**Off Work** is a multi-tenant SaaS platform that lets companies create an account and manage their employees' holidays and leave requests. Each company signs up as its own organization (tenant) and manages its own employees, departments, holiday policies, and leave requests, fully isolated from other tenants.

## ✨ Key Features

- **Multi-tenant architecture** — every company operates as an isolated organization, with its own employees, departments, and settings.
- **Leave request management** — employees can submit, view, and cancel leave requests; managers and HR can review and act on their team's requests.
- **Personal & team calendars** — a personal calendar (`/me/calendar`) and a team-wide calendar (`/team/calendar`) for visualizing time off.
- **Departments** — organize employees into departments, with managers assigned per team.
- **Closure days & bank holidays** — configure company closure days and import UK bank holidays (England & Wales / Scotland / Northern Ireland), shown alongside company-wide closures.
- **Team dashboard** — an overview for managers/HR of team availability and pending requests.
- **Role-based access control** — different permission levels across the organization (see below).
- **Email notifications** — password reset, email verification, and other transactional emails via Resend.

## 👥 Roles & Permissions

The platform is designed around the following roles:

| Role | Scope |
|---|---|
| **System Admin** | Platform-level administration across all tenant organizations |
| **Owner** | Full control over a single company's account, billing, and settings |
| **HR** | Manages employees, departments, and leave policies across the organization |
| **Manager** | Manages their own team's employees and leave requests |
| **Employee** | Submits and tracks their own leave requests |

> **Current implementation status:** the data model currently supports the `Manager` and `Employee` roles end-to-end (route groups `(app)/me` for employees and `(app)/team` for managers/HR-level views). Support for the `Owner`, `HR`, and `System Admin` roles is on the roadmap as the permission model is extended.

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) 16 (App Router)
- **Language:** TypeScript
- **UI:** [Mantine](https://mantine.dev/) (core, dates, charts, forms, notifications)
- **Database:** MongoDB with [Mongoose](https://mongoosejs.com/)
- **Authentication:** [Better Auth](https://www.better-auth.com/) (email/password, email verification, `organization` and `admin` plugins for multi-tenancy)
- **Email:** [Resend](https://resend.com/) + [React Email](https://react.email/)
- **Charts:** Recharts
- **Linting/formatting:** [Biome](https://biomejs.dev/)

## 🏗️ Architecture

- **Multi-tenancy** is handled through Better Auth's `organization` plugin, which is the source of truth for tenants (organizations, members, invitations). The `Employee` collection acts as an HR profile linked 1:1 to a Better Auth user via `userId`, and is scoped to a tenant via `organizationId`.
- **Two-layer security model:**
  1. `middleware.ts` performs a fast, edge-level cookie-presence check before a request reaches a protected route.
  2. `auth.api.getSession()` is called inside layout files for full cryptographic session/role verification server-side.
- **Route groups:**
  - `(app)/me` — the employee-facing area (personal calendar, personal leave requests).
  - `(app)/team` — the manager/HR-facing area (team dashboard, team calendar, employees, departments, leave requests, settings).
  - `(marketing)` — the public-facing marketing site.

## 📁 Project Structure

```
src/
  actions/          # Server actions, split by role (admin, employee, manager, public, shared)
  app/
    (app)/
      me/            # Employee-facing pages (calendar, leave requests)
      team/          # Manager/HR-facing pages (dashboard, employees, departments, settings)
    (marketing)/     # Public marketing pages
    api/auth/        # Better Auth route handler
  db/
    models/          # Mongoose models (Employee, Department, LeaveRequest, ClosureDay)
    connection.ts    # MongoDB connection helper
  hooks/             # Client-side data hooks
  lib/               # Better Auth server/client setup, email sending
  theme/             # Mantine theme configuration
  types/             # Shared TypeScript types
  utils/             # Auth/organization helpers, non-working-day utilities
```

## 🚀 Getting Started

### Prerequisites

- Node.js
- A MongoDB instance (local or hosted, e.g. MongoDB Atlas)
- A [Resend](https://resend.com/) account for transactional email

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

The app will be available at `http://localhost:3000`.

### Other Scripts

```bash
npm run build    # Production build
npm run start    # Start the production server
npm run lint      # Lint with Biome
npm run format    # Format with Biome
```

## 🗺️ Roadmap

- [ ] Implement `Owner`, `HR`, and `System Admin` roles and permissions
- [ ] Organization-level billing/subscription management
- [ ] Extended leave policy configuration (accrual rules, carry-over, approval workflows)
- [ ] Notifications dropdown enhancements

## 📄 License

This project is currently private/unlicensed.
