# Environment

Konfiguracja developerska Off-Work. Czytaj przed zadaniem zależnym od konfiguracji, wersji bibliotek, poleceń npm lub API bibliotek.

Oznaczenia: **[declared]** = wersja z `package.json`; **[lock]** = wersja w `package-lock.json`; **[installed]** = wersja w `node_modules` (sprawdzona 2026-10-24); **[unverified]** = nie udało się ustalić.

## System i powłoka
- Windows (`$env:OS` = `Windows_NT`). Wersja builda 26100 wynika z numeru PowerShell (`5.1.26100.9711`); nie sprawdzano osobno wersji systemu. [installed, 2026-10-24]
- Terminal: Windows PowerShell 5.1 (edycja Desktop), `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`. [installed, 2026-10-24]
- Sekwencjonuj polecenia w PowerShell przez `;`. Operatora `&&` w tym środowisku nie testowano. [unverified]
- Dostępne w PATH: `node`, `npm`, `pnpm` (10.18.2). Niedostępne: `yarn`, `bun`. Projekt używa npm (zob. niżej), więc instaluj i uruchamiaj przez `npm`. [installed, 2026-10-24]
- Konfiguracji terminala VS Code nie sprawdzano. [unverified]

## Node.js i menedżer pakietów
- Node.js: v20.19.2 [installed, 2026-10-24]. Next.js 16.2.10 deklaruje `engines.node >=20.9.0`, więc wersja spełnia wymóg.
- npm: 10.8.2 [installed, 2026-10-24]. pnpm 10.18.2 też jest zainstalowany globalnie, ale w repo nie ma `pnpm-lock.yaml`, więc nie jest używany przez projekt.
- Brak plików `.nvmrc`, `.node-version`, `.npmrc` w katalogu głównym (sprawdzone 2026-10-24). Wersja Node nie jest przypięta w repo.
- Lockfile: `package-lock.json`, `lockfileVersion 3` [lock]. Menedżer pakietów projektu: **npm**.

## Biblioteki (declared / lock / installed)
| Pakiet | Deklaracja (`package.json`) | Lock | Zainstalowana |
|---|---|---|---|
| next | 16.2.10 (przypięta) | 16.2.10 | 16.2.10 |
| react / react-dom | 19.2.4 (przypięta) | 19.2.4 | 19.2.4 |
| @mantine/core, dates, hooks, modals, notifications, nprogress, schedule | ^9.5.1 (form ^9.5.0) | 9.5.1 (core) | 9.5.1 (core, dates) |
| @mantine/charts | ^9.5.1 | — | [unverified] |
| mongoose | ^9.8.1 | 9.8.1 | 9.8.1 |
| better-auth | ^1.7.1 | 1.7.1 | 1.7.1 |
| typescript | ^5 | 5.9.3 | 5.9.3 |
| @biomejs/biome | 2.2.0 (przypięta) | 2.2.0 | 2.2.0 |
| babel-plugin-react-compiler | 1.0.0 (przypięta) | 1.0.0 | 1.0.0 |
| resend | ^6.12.2 | 6.12.2 | 6.12.2 |
| dayjs | ^1.11.21 | 1.11.21 | 1.11.21 |
| @types/node | ^20 | 20.19.43 | 20.19.43 |
| @types/react | ^19 | — | 19.2.17 |
| @react-email/components / render | ^1.0.12 / ^2.1.0 | — | [unverified] |
| @tabler/icons-react | ^3.45.0 | — | [unverified] |
| recharts | ^3.10.1 | — | [unverified] |

Uwaga: w tabeli „—” oznacza, że w tej sesji nie sprawdzono wersji w lockfile ani `node_modules`. Nie jest to potwierdzenie braku pakietu.

## Skrypty npm (`package.json`)
- `npm run dev` → `next dev`
- `npm run build` → `next build`
- `npm run start` → `next start`
- `npm run lint` → `biome check`
- `npm run format` → `biome format --write`
- Nie ma skryptu `test`. [declared]

Polecenia z README (`npm install`, `npm run dev`, `build`, `start`, `lint`, `format`) są zgodne z `package.json`. [declared]

Nie uruchamiano w tej sesji: `npm install`, `npm run build`, `npm run lint`, `npm run dev`. Ich wynik nie jest zweryfikowany. [unverified]

## Konfiguracja wpływająca na wersje i API
- **Next.js 16 + `proxy.ts`:** ochrona tras działa w `src/proxy.ts`, nie w `middleware.ts`. README nadal wspomina `middleware.ts` (nieaktualne). Zob. TOPIC-002.
- **Next.js 16 API:** przed zmianą API Next sprawdzaj dokumentację w `node_modules/next/dist/docs/` (katalog istnieje, sprawdzone 2026-10-24). Zob. TOPIC-005.
- **React Compiler:** `next.config.ts` ma `reactCompiler: true`, a `babel-plugin-react-compiler` jest w devDependencies.
- **Biome 2.2.0:** `biome.json` używa schemy `2.2.0`. Lint i format to Biome, nie ESLint ani Prettier. Zob. TOPIC-005.
- **TypeScript:** `tsconfig.json` ma `strict: true`, `target: ES2017`, `moduleResolution: bundler`, alias `@/*` → `./src/*`.
- **Build errors ignorowane:** `next.config.ts` ma `typescript.ignoreBuildErrors: true`. Błędy typów nie zatrzymają `next build`. [declared]
- **Mongoose 9:** połączenie przez `dbConnect()` z `bufferCommands: false`. Zob. TOPIC-001.
- **Better Auth 1.7.1:** serwer w `src/lib/auth.ts`, z pluginami `organization` i `admin`. Zob. TOPIC-002.
- **Mantine 9:** `@mantine/core` wymaga `react ^19.2.0` (peer, sprawdzone w `node_modules`).

## Zmienne środowiskowe
- Plik `.env.local` istnieje w katalogu głównym. Jego zawartości nie odczytywano (dane wrażliwe). [installed, 2026-10-24]
- Wymagane według dokumentacji i kodu: `MONGODB_URI`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`. Obecność każdej z nich w `.env.local` [unverified].

## Znane problemy środowiskowe
- Próba odczytu `package-lock.json` przez `ConvertFrom-Json` w PowerShell 5.1 zakończyła się błędem (`Cannot process argument because the value of argument "name" is not valid`). Lockfile odczytano przez `node -e "require(...)"`. [verified 2026-10-24]
- W wynikach poleceń widać fragmenty sekwencji ANSI (`:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe\u001b\\`). Traktuj je jako artefakt wyjścia, nie jako dane. [observed 2026-10-24]
- Wersje w `node_modules` odpowiadają lockfile dla sprawdzonych pakietów. Pełnej zgodności wszystkich pakietów nie sprawdzano. [unverified]
