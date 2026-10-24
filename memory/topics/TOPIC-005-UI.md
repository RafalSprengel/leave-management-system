# TOPIC-005 — Frontend Conventions

## Key Facts
- Framework: Next.js 16.2.10 with App Router, React 19.2.4, `babel-plugin-react-compiler`.
- Route groups: `src/app/(app)/me` (employee area), `src/app/(app)/team` (manager/HR area), `src/app/(marketing)` (public pages). Auth API route: `src/app/api/auth`.
- Root layout: `src/app/layout.tsx`. Global styles: `src/app/globals.css`.
- UI library: Mantine 9 (`core`, `dates`, `charts`, `form`, `hooks`, `modals`, `notifications`, `nprogress`, `schedule`). Theme: `src/theme/theme.ts`, CSS modules in `src/theme/classes.module.css`.
- Charts: Recharts ^3 and `@mantine/charts`. Icons: `@tabler/icons-react`.
- Client data access goes through custom hooks in `src/hooks/`. Server actions are described in the README as `src/actions/` (admin, employee, manager, public, shared).
- Lint and format: Biome (`npm run lint`, `npm run format`).

## Constraints
- Lint/format with Biome, not ESLint or Prettier.
- Do not change the `next` version without checking `node_modules/next/dist/docs/`, because Next.js 16 APIs differ from earlier versions.

## Decisions & Log
- (empty)
