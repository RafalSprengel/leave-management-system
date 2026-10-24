# TOPIC-002 — Authentication, Organizations & Email

## Key Facts
- Auth library: Better Auth ^1.7.1. Server setup in `src/lib/auth.ts`, client setup in `src/lib/auth-client.ts`, session helper in `src/lib/session.ts`.
- `getAuth()` is a lazy singleton. It calls `dbConnect()` and then `createAuth(db)`.
- Plugins: `organization` (tenants, members, invitations) and `admin` (platform level, `adminRoles: ["admin"]`, `defaultRole: "user"`).
- Email/password: min length 8, `requireEmailVerification: true`.
- Session cookie cache: 5 minutes (`session.cookieCache` in `src/lib/auth.ts`). Most server actions read the user via `getCachedSession()` (`src/lib/session.ts`). `getCurrentEmployeeRole({ freshSession: true })` uses `getCachedFreshSession()` (`disableCookieCache: true`) instead.
- `userId` handling: the comment in `src/lib/auth.ts` recommends accepting `userId` from the client in actions that run right after `setActive()`. This is a recommendation only, not a rule applied across the codebase. Current behavior: most actions take the user from the cached session. `createLeaveRequest` (`src/actions/admin/leave/createLeaveRequest.ts`) takes `userId` from the client and uses it directly in `Employee.findById(data.userId)` without an organization filter (verified 2026-10-24).
- Route protection: `src/proxy.ts` checks the session for `/me/:path*` and `/team/:path*` and redirects to `/sign-in` if there is none. Next.js 16 uses `proxy.ts` (not `middleware.ts`, which the README still mentions).
- Invitation flow: if the sign-up request has header `x-invitation-id` and a pending invitation exists for that email, the verification email is skipped. The accept-invitation flow marks the email as verified.
- `organization.afterAddMember` hook creates an `Employee` profile linked by `userId` and `organizationId`. Role mapping: `admin` and `owner` become `Manager`, everything else becomes `Employee`. The owner gets the "Administration" department (created if missing) and `isOwner: true`.
- `trustedOrigins` is defined in `src/lib/auth.ts`. Add new origins there.
- Email delivery: `src/lib/sendEmail.ts` exports `sendEmail({ to, subject, html })`. It sends via Resend (client created lazily) with `from` set from `EMAIL_FROM` (fallback `Off Work <onboarding@resend.dev>`). Without `RESEND_API_KEY` it only logs to the console and returns, so no email is sent. On Resend error it logs and re-throws. Callers found: `src/lib/auth.ts` (password reset, email verification, organization invitation), `src/actions/admin/employees/resendInvitation.ts`, `src/actions/admin/employees/activateEmployee.ts`, leave notifications in `src/actions/admin/leave/reviewLeaveRequest.ts`, `src/actions/employee/leave/createLeaveRequest.ts` and `src/actions/employee/leave/cancelLeaveRequest.ts`. Leave e-mail subjects and HTML are built in `src/lib/emails/leaveRequestEmails.ts`.

## Constraints
- Env variables: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`.
- The Owner, HR and System Admin roles are on the roadmap (README). The current data model supports only Manager and Employee end-to-end.

## Decisions & Log
- 2026-10-24 — Analysis of `getOrganizationId` (`src/utils/getOrganizationId.ts`, no code change). It reads `session.session.activeOrganizationId` from `getCachedSession()` and throws if missing. It does NOT check the user's role or membership. Role checks exist only in `getCurrentEmployeeRole()` (used by `src/app/(app)/team/layout.tsx`, `src/actions/manager/leave/*` and a few pages). No action in `src/actions/admin/` calls `getCurrentEmployeeRole`, so they rely on org scoping only. Reason: server actions are callable directly, so org scoping alone does not restrict them to managers. Files: `src/utils/getOrganizationId.ts`, `src/actions/shared/getCurrentEmployeeRole.ts`, `src/actions/admin/leave/createLeaveRequest.ts`.
