# TOPIC-001 — Database

## Key Facts
- MongoDB accessed via Mongoose ^9.8.1.
- Connection helper: `src/db/connection.ts` (`dbConnect`). It caches the connection on `global.mongoose` and sets `bufferCommands: false`.
- `connection.ts` imports `@/db/models`, which registers all models. Import models through this barrel when registering them.
- Required env variable: `MONGODB_URI` (in `.env.local`). The module throws at import time if it is missing.
- Models live in `src/db/models/` (Employee, Department, LeaveRequest, LeaveAllowance, Absence, OrganizationSettings, ClosureDay and others).
- Better Auth uses the native MongoDB adapter (`mongodbAdapter`) on `mongoose.connection.db`. See TOPIC-002.

## Constraints
- Call `dbConnect()` before any model query in server code. With `bufferCommands: false`, queries fail if the connection is not open.
- Every tenant-scoped query must filter by `organizationId`.

## Decisions & Log
- (empty)
