# Progress

Stan prac między zadaniami i oknami czatu. Czytaj na początku zadania, po `memory/mainContext.md` i `memory/project-map.md`. Trwałe fakty są w `memory/topics/TOPIC-*.md`, a nie tutaj.

## Current focus
- Rozbudowa systemu pamięci o śledzenie postępu (ten plik, `.clinerules/memory-system.md`, `memory/mainContext.md`). Bez zmian w kodzie aplikacji.

## Completed
- 2026-10-24 — Analiza pozostałego salda urlopu (tylko odczyt, bez zmian w plikach). Ustalono dwa miejsca liczenia: `getLeaveRemaining()` w `src/utils/leaveRules.ts` odejmuje oczekujące wnioski przy `includePending = true`, a `getMyLeaveBalance()` w `src/actions/employee/leave/getMyLeaveBalance.ts` ich nie odejmuje. Potwierdzone w kodzie.
- 2026-10-24 — Dodano sekcję `## Known Issues & Follow-up` do `memory/topics/TOPIC-003-LEAVE.md` z opisem rozbieżności (status: Needs verification).

## In progress
- Rozbudowa systemu pamięci o śledzenie postępu. Zakończenie wymaga sprawdzenia zapisanych plików.

## Next steps
1. Ustalić zamierzone zachowanie: czy `/me` ma pokazywać saldo pomniejszone o oczekujące wnioski. Jeśli tak, potwierdzić problem w działającej aplikacji. Pliki: `src/actions/employee/leave/getMyLeaveBalance.ts`, `src/app/(app)/me/page.tsx`, `src/utils/leaveRules.ts`.
2. Sprawdzić niezweryfikowane punkty z `memory/project-map.md` (sekcja 6): zawartość `scripts/migrate-annual-to-holiday.mjs`, pokrycie filtrów `organizationId` we wszystkich akcjach, kontrolę roli na stronach `team/*` poza layoutem.
3. Zweryfikować w kodzie zgłoszenie z TOPIC-002: `src/actions/admin/leave/createLeaveRequest.ts` przyjmuje `userId` z klienta i używa go bez filtra `organizationId`.
4. Zdecydować, czy akcje w `src/actions/admin/` mają wywoływać `getCurrentEmployeeRole` (TOPIC-002, Decisions & Log, 2026-10-24).

## Known blockers and issues
Potwierdzone w kodzie (wpływ nie testowany w działającej aplikacji):
- Rozbieżność salda z oczekującymi wnioskami: `getMyLeaveBalance` nie odejmuje `pending`, a `getLeaveRemaining(..., true)` odejmuje. Szczegóły: TOPIC-003, `## Known Issues & Follow-up`. Status: Needs verification.
- `src/actions/admin/leave/createLeaveRequest.ts` używa `userId` z klienta bez filtra `organizationId`. Szczegóły: TOPIC-002. Status: potwierdzone w kodzie, wpływ niezweryfikowany.

Hipotezy (niepotwierdzone):
- Akcje w `src/actions/admin/` nie sprawdzają roli, a polegają tylko na filtrze organizacji. Status: Needs verification.
- `src/utils/auth.ts` jest pusty. Nie wiadomo, czy coś go importuje. Status: Needs verification.

Blokery: brak zapisanych.

## Last updated
- 2026-10-24.
- Ostatnie zadanie: analiza salda urlopu w trybie tylko do odczytu oraz dopisanie sekcji Known Issues do TOPIC-003. Brak wcześniejszych wpisów postępu w pamięci, więc stan początkowy opiera się wyłącznie na wpisach powyżej.
