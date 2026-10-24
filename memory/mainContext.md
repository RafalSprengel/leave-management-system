# Main Context Index

## How to use
1. At the start of a task, read this file. Do not read all topics.
2. Match the task against the keywords below and open only the matching files in `memory/topics/`.
3. Treat memory as a starting point. Before using a fact, verify it in the code. If it is outdated, correct the topic file.
4. After a task that changed code, add an entry to `## Decisions & Log` in the relevant topic, using the format `- YYYY-MM-DD — <change>. Reason: <why>. Files: <paths>.`
5. Do not copy code or conversation history into memory.

## Topics

- TOPIC-001 — Database (Mongoose, connection, models)
  Keywords: mongoose, mongodb, connection, model, schema, dbConnect
  Path: memory/topics/TOPIC-001-DB.md

- TOPIC-002 — Authentication, Organizations & Email (Better Auth, proxy, roles, invitations, Resend)
  Keywords: auth, better-auth, session, login, sign-in, invitation, organization, role, admin, email, resend, proxy
  Path: memory/topics/TOPIC-002-AUTH.md

- TOPIC-003 — Leave Requests & Balances (leave rules, allowances, working days, billing period)
  Keywords: leave, request, cancel, approve, balance, allowance, remaining, holiday, absence, working days, half day
  Path: memory/topics/TOPIC-003-LEAVE.md

- TOPIC-004 — Employees, Departments & Organization Settings (HR profiles, closure days, bank holidays)
  Keywords: employee, department, manager, settings, closure, non-working, bank holiday, holidayYearStart
  Path: memory/topics/TOPIC-004-ORG.md

- TOPIC-005 — Frontend Conventions (Next.js 16 App Router, Mantine, client hooks, route groups)
  Keywords: page, route, layout, component, mantine, hook, ui, calendar, form, theme
  Path: memory/topics/TOPIC-005-UI.md

## Progress
- `memory/progress.md` — current focus, completed work, in-progress items, next steps, known blockers and the last update. Read it at the start of a task to resume work from the last saved state. It is not a topic file.
  Keywords: progress, resume, continue, next steps, in progress, blockers, last updated
  Path: memory/progress.md

## Environment
- `memory/environment.md` — wersje Node/npm, bibliotek (Next, React, Mantine, Mongoose, Better Auth, TypeScript, Biome), skrypty `package.json`, lockfile i znane problemy PowerShell. Czytaj przed zadaniem zależnym od konfiguracji, wersji bibliotek, poleceń terminala lub API bibliotek. Nie traktuj zapisanych wersji jako aktualnych bez sprawdzenia w `package.json`/`package-lock.json`.
  Keywords: environment, version, node, npm, lockfile, script, install, build, powershell, terminal, api, next, react, mantine, mongoose, better-auth, biome, typescript
  Path: memory/environment.md
