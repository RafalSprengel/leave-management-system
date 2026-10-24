# TOPIC-003 — Leave Requests & Balances

## Key Facts
- Core rules: `src/utils/leaveRules.ts`.
  - `getLeaveRemaining(organizationId, employeeId, type, anyDateInPeriod, includePending = false)` returns `{ remaining, allowance, used, pending, period }`.
  - `getApprovedOverlap(...)` finds an approved request that overlaps the given range, counting only working days.
  - `countRequestWorkingDays(...)` counts working days in a range and subtracts 0.5 for each half-day at the start or end.
- Billing period: `src/utils/billingPeriod.ts` (`getBillingPeriod`), based on `OrganizationSettings.holidayYearStart` (default `"01-01"`).
- Holiday allowance priority (`src/utils/leaveBalance.ts` `resolveHolidayAllowance`): `LeaveAllowance` document, then `Employee.holidayAllowance`, then organization default, then `DEFAULT_LEAVE_ALLOWANCE_DAYS`.
- Holiday usage = approved `LeaveRequest` days plus `Absence` days in the period (`countHolidayUsedInPeriod`). Pending requests are counted separately and reduce `remaining` only when `includePending` is true.
- Non-working days (weekends, closures, bank holidays) come from `src/utils/nonWorkingDays.ts` (`getNonWorkingDays`). Working-day math is in `src/utils/workingDays.ts`.
- Leave types: `src/constants/leaveTypes.ts` (`LeaveRequestType`). Allowance defaults: `src/constants/leaveAllowanceTypes.ts`.
- Types: `src/types/leaveRequest.ts`, `src/types/leaveAllowance.ts`, `src/types/absence.ts`.
- Enrichment of request data: `src/utils/enrichLeaveRequests.ts`.
- Hooks: `useMyLeaveRequests`, `useMyLeaveRequestDetails`, `useTeamLeaveRequests`, `useLeaveRequestDetails`, `useColleagueLeaveRequests`.

## Constraints
- Only `approved` requests count as used. Pending requests are included only when explicitly requested.
- Always compute day counts with the organization's non-working days, never with a plain weekday count.
- Half-days are subtracted from the count, so check both `startHalfDay` and `endHalfDay`.

## Decisions & Log
- (empty)

## Known Issues & Follow-up
- **Needs verification:** inconsistent treatment of pending requests in remaining-balance calculations.
  - Files: `src/actions/employee/leave/getMyLeaveBalance.ts` (line ~118: `remaining = max(0, allowance - used)`), `src/utils/leaveRules.ts` (`getLeaveRemaining`, line ~83: `remaining = max(0, allowance - used - pending)`, with `pending` included when `includePending = true`), `src/app/(app)/me/page.tsx` (line ~273: `daysLeft = holidayBalance.remaining`, displayed as "days left").
  - Confirmed in code: `getMyLeaveBalance` returns `pending` per type but does not subtract it from `remaining`. `getLeaveRemaining(..., true)` subtracts pending. Employee and admin `createLeaveRequest` use `true` for validation.
  - Possible impact: an employee with pending requests may see a higher "days left" on `/me` than the amount the request validation will accept.
  - Status: open. Not tested in a running application. This is a code-based observation, not a confirmed bug. Verify the intended behaviour (and whether the UI should show pending separately) before changing either function.
