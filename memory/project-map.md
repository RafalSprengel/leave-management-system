# Project Map (code index)

Zwięzły indeks kodu. Szczegóły biznesowe są w `memory/topics/TOPIC-*.md`. Ścieżki względne od `src/`, jeśli nie podano inaczej. Stan zweryfikowany 2026-10-24.

## 1. Punkty wejścia
- `src/app/layout.tsx` — root layout (providery UI).
- `src/app/(marketing)/page.tsx` — strona publiczna.
- `src/app/(auth)/*` — sign-in, sign-up, reset-password, accept-invitation (`[id]`).
- `src/app/(app)/layout.tsx` — layout zalogowanej aplikacji; sprawdza sesję i rolę (`getCurrentEmployeeRole` z `preloadedSession`).
- `src/app/(app)/me/*` — widok pracownika (`Employee`).
- `src/app/(app)/team/*` — widok managera; `team/layout.tsx` przekierowuje rolę `Employee`.
- `src/app/api/auth/[...all]/route.ts` — handler Better Auth (`getAuth().handler`).
- `src/app/verify-email/route.ts` oraz `callback/page.tsx` — weryfikacja e-mail.
- `src/proxy.ts` — ochrona tras `/me/*` i `/team/*` (sprawdza tylko istnienie sesji, nie rolę).

## 2. Warstwy i zależności
Kierunek zależności: `app/ (UI)` → `hooks/` → `actions/` → `utils/`, `db/models/`, `lib/`.
- **UI (`app/`)** — strony i komponenty. Pliki z `"use client"` importują server actions bezpośrednio (np. `team/leave-requests/new/page.tsx` importuje `actions/admin/leave/createLeaveRequest`).
- **Hooki (`src/hooks/`)** — klienckie wrappery wokół server actions (`useEmployees`, `useMyLeaveRequests`, `useNonWorkingDays`, `useRoles`, …).
- **Server actions (`src/actions/`)** — `"use server"`, logika i dostęp do DB. Podział katalogów:
  - `admin/` — zarządzanie: absences, closureDays, departments, employees, leave, leaveAllowances, settings.
  - `manager/` — odczyty zespołu: employees, leave, reports.
  - `employee/` — dane własne: absences, leave.
  - `shared/` — `getCurrentEmployeeId.ts`, `getCurrentEmployeeRole.ts`, `getCurrentEmployee.ts`.
  - `public/` — invitation, bankHolidays, roles.
- **Modele (`src/db/`)** — `connection.ts` (`dbConnect`, cache na `global.mongoose`, `bufferCommands: false`), `models/*.ts` (Employee, Department, LeaveRequest, LeaveAllowance, Absence, ClosureDay, OrganizationSettings). `models/index.ts` rejestruje wszystkie modele, z wyjątkiem `LeaveAllowance` (importowany bezpośrednio przez akcje). Szczegóły: TOPIC-001.
- **Logika biznesowa (`src/utils/`)** — `leaveRules.ts`, `leaveBalance.ts`, `billingPeriod.ts`, `workingDays.ts`, `nonWorkingDays.ts`, `dateRangeRules.ts`, `enrichLeaveRequests.ts`, `formatDateList.ts`. Stałe typów urlopów w `src/constants/` (`leaveTypes.ts`, `leaveAllowanceTypes.ts`).
- **Auth/sesja (`src/lib/`)** — `auth.ts` (konfiguracja Better Auth, `getAuth()`), `auth-client.ts` (klient), `session.ts` (`getCachedSession`, `getCachedFreshSession`), `sendEmail.ts` (Resend), `emails/leaveRequestEmails.ts` (szablony).
- **Typy (`src/types/`)** — interfejsy domenowe, po jednym pliku na obszar.
- **Motyw** — `src/theme/theme.ts` (Mantine).

## 3. Bezpieczeństwo (granice)
- **Kto jest zalogowany:** `getCachedSession()` (`src/lib/session.ts`). Cache sesji 5 min (`src/lib/auth.ts`). Po zmianie organizacji lub roli używaj `getCachedFreshSession()` / `getCurrentEmployeeRole({ freshSession: true })`.
- **Organizacja:** `getOrganizationId()` (`src/utils/getOrganizationId.ts`) zwraca `session.activeOrganizationId` albo rzuca wyjątek. Nie sprawdza roli ani członkostwa.
- **Pracownik bieżącego użytkownika:** `getCurrentEmployeeId()` (`src/actions/shared/getCurrentEmployeeId.ts`).
- **Rola:** `getCurrentEmployeeRole()` (`src/actions/shared/getCurrentEmployeeRole.ts`). Zwraca `Manager`/`Employee`, blokuje konta `inactive`. Używana w layoutach i w akcjach `manager/leave/*`.
- **Luka do weryfikacji:** żadna akcja w `src/actions/admin/` nie wywołuje `getCurrentEmployeeRole`. Mają tylko filtr po organizacji. Szczegóły i zalecenia: TOPIC-002 (Decisions & Log, 2026-10-24).
- **Luka do weryfikacji:** `src/actions/admin/leave/createLeaveRequest.ts` przyjmuje `userId` z klienta i używa go w `Employee.findById(data.userId)` bez filtra `organizationId`. Potwierdzone w kodzie.
- **Izolacja danych:** zapytania powinny zawsze zawierać `organizationId` (np. `Employee.findOne({ _id, organizationId })`). Wiele akcji tak robi, ale nie wszystkie są zweryfikowane.
- **Ochrona tras:** `src/proxy.ts` sprawdza tylko sesję. Ochrona roli działa w layoutach i w samych akcjach.


## 4. Gdzie szukać przy typowych zadaniach
- **Logika urlopów (wnioski, limity, dni robocze):** `src/actions/employee/leave/`, `src/actions/admin/leave/`, `src/actions/manager/leave/` → `src/utils/leaveRules.ts`, `leaveBalance.ts`, `billingPeriod.ts`, `workingDays.ts`, `enrichLeaveRequests.ts` → `src/db/models/LeaveRequest.ts`, `LeaveAllowance.ts`. Patrz TOPIC-003.
- **E-maile o urlopach:** `src/lib/emails/leaveRequestEmails.ts`, `src/lib/sendEmail.ts`. Patrz TOPIC-002.
- **Uwierzytelnianie i role:** `src/lib/auth.ts`, `src/lib/session.ts`, `src/proxy.ts`, `src/actions/shared/getCurrentEmployee*.ts`, `src/app/(auth)/*`. Patrz TOPIC-002.
- **Organizacje, zaproszenia:** `src/lib/auth.ts` (plugin `organization`, hook `afterAddMember`), `src/actions/public/invitation/*`, `src/actions/admin/employees/resendInvitation.ts`. Patrz TOPIC-002.
- **Pracownicy i działy:** `src/actions/admin/employees/*`, `src/actions/admin/departments/*`, `src/actions/manager/employees/*`, `src/db/models/Employee.ts`, `Department.ts`, UI w `src/app/(app)/team/employees/` i `team/departments/`. Patrz TOPIC-004.
- **Ustawienia organizacji, święta, zamknięcia:** `src/actions/admin/settings/*`, `src/actions/admin/closureDays/*`, `src/actions/public/bankHolidays/*`, `src/db/models/OrganizationSettings.ts`, `ClosureDay.ts`, UI w `src/app/(app)/team/settings/`. Patrz TOPIC-004.
- **Nieobecności:** `src/actions/admin/absences/*`, `src/actions/employee/absences/*`, `src/db/models/Absence.ts`. Patrz TOPIC-003.
- **Raporty i statystyki:** `src/actions/manager/reports/getReportData.ts`, `src/types/stats.ts`, `src/types/dashboard.ts`, UI `src/app/(app)/team/reports/`.
- **UI / komponenty:** `src/app/(app)/components/` (AppShell, Sidebar, Notifications), komponenty przy stronach w `_components/`. Konwencje: TOPIC-005.
- **Hooki:** `src/hooks/*`. Wszystkie są `"use client"` i wołają server actions.
- **Skrypty:** `scripts/migrate-annual-to-holiday.mjs` (zawartość niezweryfikowana).

## 5. Ignorowane przy wyszukiwaniu
- `repomix-output.xml` (root) oraz `memory/topics/repomix-output.xml` — duże pliki zrzutu. Nie czytaj i nie przeszukuj ich.
- `node_modules/`, `.next/`, `.git/`.
- `src/utils/auth.ts` — pusty plik (0 bajtów). Nie zawiera logiki. Niezweryfikowane, czy coś go importuje.

## 6. Niezweryfikowane punkty
- Zawartość `scripts/migrate-annual-to-holiday.mjs` nie została odczytana.
- Pokrycie filtrów `organizationId` we wszystkich akcjach nie zostało sprawdzone.
- Nie sprawdzono, czy wszystkie strony `team/*` mają kontrolę roli poza layoutem.
