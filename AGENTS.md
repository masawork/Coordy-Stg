# Repository Guidelines

## Project Structure & Module Organization
Coordy is a Next.js App Router project. Primary routes live in `app/` (e.g., `app/admin`, `app/user`, `app/test` for the Amplify sandbox) with `app/layout.tsx` controlling shared wrappers. UI primitives sit in `components/` (subfolders `common`, `sections`, `modals`, etc.) and stateful helpers stay in `lib/` plus `src/lib` for legacy utilities. AWS Amplify definitions are under `amplify/` and `test/amplify`, and static assets plus global styles stay in `public/` and `app/globals.css`. Keep documentation and specs in `DOCS/` and reference credentials via `amplify_outputs.json`.

## Build, Test, and Development Commands
- `npm install` once to sync dependencies listed in `package.json`.
- `npm run dev` starts the Next.js dev server with Amplify auth, available at `http://localhost:3000`.
- `npm run build` compiles the production bundle and validates route handlers.
- `npm run start` runs the optimized build locally; use it before releasing.
- `npm run lint` executes Next.js + ESLint + Tailwind rules; CI expects a clean pass.
- `npx ampx sandbox --once` deploys the lightweight backend defined in `test/amplify` and refreshes `amplify_outputs.json`.

## Coding Style & Naming Conventions
Use TypeScript everywhere. Follow the existing two-space indentation and favor arrow or function components returning JSX fragments. Exported React components are PascalCase (`HeroSection.tsx`), hooks/utilities are camelCase, and route segment folders match the URL slug (`app/verify`). Keep Tailwind classes ordered logically (layout -> spacing -> color) and rely on `clsx` or `class-variance-authority` for conditional styling. Run `npm run lint` before pushing; it enforces Next.js defaults plus accessibility checks.

## Testing Guidelines
Smoke-test Amplify flows inside `/app/test/signup` using the sandbox backend. After `npx ampx sandbox --once`, run `npm run dev` and navigate to `/test/signup`, watching for the `Amplify（/test環境）初期化完了` log. Add Playwright or React Testing Library specs under `test/lib` or `app/**/__tests__` and mirror file names (`HeroSection.test.tsx`) with the component they cover. Document any manual verification steps in `DOCS/` and flag gaps in the PR.

## Commit & Pull Request Guidelines
Commits follow Conventional Commits, as seen in `docs:` and `feat:` history; keep scopes short (`feat(auth): add MFA prompt`). PRs need a crisp summary, linked issues (for example, "Closes #42"), screenshots for UI-facing changes, and notes on Amplify migrations or environment updates. Rebase onto the latest `main`, ensure `npm run build && npm run lint` pass locally, and describe any new AWS resources or secrets added.

## Security & Configuration Tips
Never edit `amplify_outputs.json` manually; regenerate it via the Amplify CLI and keep secrets in `.env.local` (excluded by `.gitignore`). Clear sensitive data before committing logs, and restrict test credentials to disposable accounts. Running `npm run build` surfaces auth misconfigurations early, so add that to your pre-PR checklist.
