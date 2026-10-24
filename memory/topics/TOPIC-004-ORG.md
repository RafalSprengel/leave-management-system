# TOPIC-004 — Employees, Departments & Organization Settings

## Key Facts
- `Employee` is the HR profile. It is linked 1:1 to a Better Auth user through `userId` and scoped to a tenant through `organizationId`. Fields include `role` (Manager/Employee), `isOwner`, `department`, `employmentDate`, `status`, `holidayAllowance`.
- `Department` (`src/db/models/Department.ts`) has `name`, `organization`, and `managers`.
- `OrganizationSettings` holds `holidayYearStart` and `defaultAllowances`.
- `ClosureDay` stores company closure days. They are treated as non-working days.
- UK bank holidays: `src/hooks/useUkBankHolidays.ts`. The README lists England & Wales, Scotland and Northern Ireland as supported regions.
- Types: `src/types/employees.ts`, `src/types/department.ts`, `src/types/orgSettings.ts`, `src/types/closureDay.ts`.
- Dedicated hooks: `useEmployees`, `useCurrentEmployee`, `useDepartments`, `useManagers`, `useRoles`, `useNonWorkingDays`.
- Migration script: `scripts/migrate-annual-to-holiday.mjs`.

## Constraints
- Employee and department data must always be scoped by `organizationId`.
- The "Administration" department is created automatically for the organization owner (see TOPIC-002).

## Decisions & Log
- (empty)
