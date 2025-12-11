# Repository Guidelines

## Project Structure & Module Organization
- Routes live in `app/` using the Next.js App Router; `app/layout.tsx` supplies shared wrappers.
- UI primitives sit under `components/` (`common`, `sections`, `modals`), while stateful helpers use `lib/` and legacy utilities stay in `src/lib/`.
- Amplify infrastructure is split between `amplify/` (prod) and `test/amplify` (sandbox); `amplify_outputs.json` reflects the active backend.
- Static assets and global styles belong in `public/` and `app/globals.css`; documentation goes inside `DOCS/`.

## Build, Test, and Development Commands
- `npm install` — sync package dependencies once per environment.
- `npm run dev` — start the Next.js dev server with Amplify auth at `http://localhost:3000`.
- `npm run build` — compile the production bundle and validate route handlers.
- `npm run start` — serve the optimized build locally before release.
- `npm run lint` — run the Next.js + ESLint + Tailwind config expected by CI.
- `npx ampx sandbox --once` — deploy the lightweight backend in `test/amplify` and refresh `amplify_outputs.json`.

## Coding Style & Naming Conventions
- Use TypeScript everywhere with two-space indentation and React function components that return JSX fragments.
- Route segment folders mirror URL paths (`app/verify`), components use PascalCase (`HeroSection.tsx`), and hooks/utilities use camelCase.
- Order Tailwind classes logically (layout → spacing → color) and leverage `clsx` or `class-variance-authority` for conditional styles.
- Run `npm run lint` before commits; it enforces formatting, accessibility, and import rules.

## Testing Guidelines
- Favor React Testing Library or Playwright specs colocated at `app/**/__tests__` or `test/lib`.
- Name tests after the component (`HeroSection.test.tsx`) and document manual checks in `DOCS/`.
- Smoke-test Amplify flows by running `npx ampx sandbox --once`, `npm run dev`, then visiting `/test/signup` to confirm the `Amplify（/test環境）初期化完了` log.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat(auth): add MFA prompt`) and keep scopes tight.
- PRs need a clear summary, linked issues (e.g., “Closes #42”), screenshots for UI changes, and notes about Amplify migrations or secrets.
- Ensure `npm run build && npm run lint` pass locally before opening a PR, and rebase on the latest `main`.

## Security & Configuration Tips
- Never edit `amplify_outputs.json` manually; regenerate via the Amplify CLI.
- Store secrets in `.env.local` (gitignored) and scrub sensitive data from logs.
- Run `npm run build` during QA to surface authentication or configuration issues early.
