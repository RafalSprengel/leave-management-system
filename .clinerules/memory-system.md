# Memory System Rules

Persistent project memory lives in `memory/`. Each kind of information has one place:

- `memory/mainContext.md` - index of topics with keywords and paths. Keep it small.
- `memory/project-map.md` - where code lives: entry points, layers, relevant paths.
- `memory/topics/TOPIC-*.md` - durable architecture and implementation facts, constraints, decisions, and significant unresolved issues (`## Key Facts`, `## Constraints`, `## Decisions & Log`, optional `## Known Issues & Follow-up`).
- `memory/progress.md` - current state of work between tasks and windows: focus, completed, in progress, next steps, blockers.
- `memory/environment.md` - versions, package scripts, lockfile, terminal and environment issues.

## Start of every task
1. Read `memory/mainContext.md`, then `memory/project-map.md`, then `memory/progress.md`.
2. Load only the `memory/topics/TOPIC-*.md` files whose keywords match the task. Do not read all topics.
3. Read `memory/environment.md` only if the task depends on configuration, library versions or APIs, scripts, or terminal commands. See "Environment, versions and commands".
4. Treat memory as a starting point. Verify every fact you rely on in the code, and read the repository only as far as the task needs.
5. If `progress.md` lists unfinished work, check its current state in the code before continuing. Do not assume it is still accurate.
6. If the new task does not continue the previous one, do not treat the previous `Current focus` as its goal.
7. If a fact is outdated, correct it in the relevant topic file (`## Key Facts` or `## Constraints`). Add a `## Decisions & Log` entry only when the correction is technically significant or affects future work.
8. Check whether the user's latest instructions supersede any requirement, decision or open task recorded in memory. The latest explicit user decision takes precedence over earlier memory and over the current code. Do not treat an old requirement as active only because it is recorded in memory or reflected in the code.

## Code analysis
- Start from the paths in `memory/project-map.md` and from the files and dependencies named in the relevant topic.
- For large files, read only the relevant line range when that is enough.
- Expand the search (more files, repository-wide search) only when the answer, verification or a security assessment requires it.
- Do not repeat a search that has already given a sufficient result.
- Do not scan the whole repository, and do not open dump files such as `repomix-output.xml` (root and `memory/topics/`) without a specific reason.
- Do not run full project checks (install, build, lint, dev server) without a reason.

## Recording information
- Durable architecture and implementation facts, and significant issues: the matching `TOPIC-*.md`.
- Important decisions, constraints and corrections: `## Decisions & Log` of the affected topic. Entry format: `- YYYY-MM-DD — <what changed>. Reason: <why>. Files: <key paths>.` If several topics are affected, add one entry to each. Log meaningful decisions and important technical findings, not routine observations or debugging steps.
- Changed or reversed requirements: the newer explicit user decision supersedes the older one. Find all references to the old requirement in `memory/` (topics, `progress.md`, `project-map.md`, `mainContext.md`) and update or remove outdated active statements, so the current requirement is unambiguous. Keep historical context only when useful, marked `Superseded` with its date and the replacing decision. Add one dated `Decisions & Log` entry to each affected topic stating what changed and the current decision. Do not duplicate an existing entry.
- Requirement vs implementation: state separately the current intended behaviour, what the code currently implements, any gap between them, and what still needs verification. Updating memory does not mean the application code has been updated.
- Scope of changes: if the user asks only to record or document a decision, change memory only and do not modify application code. If the user also asks for implementation, update the code and verify it against the new requirement. If it is unclear whether code should change, ask before changing it.
- Unresolved problems: `## Known Issues & Follow-up` in the affected topic, with the affected file or area, the evidence, the potential impact and a status. Record potential security or correctness issues even if unresolved, and label them `Needs verification` until confirmed. Never present an untested hypothesis as a confirmed bug. Keep an issue until it is verified as resolved or no longer relevant, and update its status when new evidence appears.
- Current state of work: `memory/progress.md`. Update it when the important state of the project changed. Do not mark anything completed unless it has been verified. Separate verified facts from decisions, hypotheses and open questions.
- Versions and terminal facts: `memory/environment.md`.
- File locations: `memory/project-map.md`, only when the project structure or the mapping of important files changed.
- If no existing topic fits, create `memory/topics/TOPIC-00N-NAME.md` with the next free number and add it to `memory/mainContext.md` with keywords and path.

Rules for all entries:
- Keep entries concise. Do not copy code blocks, full file contents, conversation history, or speculation presented as fact.
- Before adding an entry, find the existing one and extend it. Do not create duplicates or repeat information recorded elsewhere.
- If nothing changed and no new findings appeared, do not update memory files.
- Do not remove unfinished work or open issues without checking their current state.

## End of a task
1. If the task changed code or a requirement, add the `## Decisions & Log` entry to each affected topic.
2. If the important state of the project changed, update `memory/progress.md`: completed steps, remaining work, decisions, issues needing verification.
3. Update `memory/project-map.md` only if the structure or the mapping of important files changed.
4. Update `memory/environment.md` only after a change to dependencies, configuration or environment, with verified data and the date.

## Progress between tasks and windows
`memory/progress.md` lets a new Cline window resume work. It is not a topic file and does not replace `memory/topics/TOPIC-*.md`. Record only what can be confirmed. If no reliable information exists for a section, state that the initial state has not been established yet. Do not invent progress, tasks or history.

## Environment, versions and commands
`memory/environment.md` holds versions, package scripts, lockfile, terminal facts and known environment issues. Each fact is marked as declared, locked, installed, verified or unverified.

1. Check recorded versions and scripts against the project only when they matter for the task, with the smallest set of reads: `package.json`, the relevant part of `package-lock.json`, and `node_modules/<pkg>/package.json` only for the package in question. Do not check every package on every task.
2. For a library API question, use the version the project actually uses. Do not propose APIs from other versions without a clear reason. For Next.js, check `node_modules/next/dist/docs/`.
3. Before running a command, check the script in `package.json`. Use `npm` (the lockfile is `package-lock.json`) and PowerShell syntax.
4. If an error suggests a version or environment mismatch, find its cause before trying more command variants.
5. After a change to dependencies, configuration or environment, update `memory/environment.md` with verified data and the date. Do not record versions you did not check. Do not install or upgrade packages as part of a memory update, and do not guess terminal configuration or tool versions; mark anything unverified as unverified.