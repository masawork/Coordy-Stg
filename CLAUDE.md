# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev              # Start dev server (Next.js 16 + Turbopack)
npm run build            # Production build
npm run lint             # ESLint
npm test                 # Jest tests
npm test -- --testPathPattern=phone  # Run specific test
npx prisma generate      # Generate Prisma client after schema changes
npx prisma db push       # Push schema to database
npx prisma studio        # DB browser GUI
npm run seed:admin       # Create admin user (admin@example.com / admin123456)
npm run setup            # Full setup: supabase + prisma generate + db push + seed
```

## Architecture

### Tech Stack
- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Supabase Auth** (JWT, email/password + Google OAuth)
- **Prisma 6** ORM with PostgreSQL (Supabase)
- **Stripe** for payments, **Resend** for email, **Google Calendar API** for Meet
- **Tailwind CSS** + Radix UI (shadcn/ui)

### Role-Based Routing

Three user roles: `USER`, `INSTRUCTOR`, `ADMIN`. Same email can have multiple roles (unique constraint on email+role).

```
/login/user, /login/instructor, /manage/login  → Auth pages
/user/(protected)/...                          → User portal
/instructor/(protected)/...                    → Instructor portal
/manage/(protected)/admin/...                  → Admin portal
/book/external                                 → External partner booking
/services, /services/[id]                      → Public service pages
```

Auth is checked client-side in each `(protected)/layout.tsx` using Supabase session + Prisma user lookup by authId.

### Auth Flow
1. Supabase Auth handles login → JWT stored in cookies via `@supabase/ssr`
2. `lib/supabase/client.ts` (browser) / `lib/supabase/server.ts` (server) create Supabase clients
3. API routes call `supabase.auth.getUser()` → find Prisma user by `authId` → check `role`
4. Admin routes use `requireAdmin()` helper pattern

### API Routes Pattern

All API routes at `app/api/[feature]/route.ts`. Standard pattern:

```typescript
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 });
  // ... Prisma queries
}
```

For Next.js 16 dynamic params: `params: Promise<{ id: string }>` (must await).

### Key Directories

- `app/api/` — 67 API route files across 17 feature areas
- `lib/auth/` — Supabase Auth helpers (client + server)
- `lib/supabase/` — Supabase client factories
- `lib/partner/` — External partner auth (HMAC-SHA256) and webhooks
- `lib/stripe/` — Stripe payment integration
- `lib/api/` — Client-side API helper functions (`*-client.ts`)
- `components/ui/` — shadcn/ui primitives
- `components/common/` — Custom reusable components (Button, etc.)
- `components/layout/` — AppHeader, Sidebar
- `prisma/schema.prisma` — Single source of truth for database schema

### External Partner API

Partners authenticate via HMAC-SHA256 signatures (`partner_id + timestamp + sig`). Routes under `/api/external/`. Partner booking page at `/book/external` with step-flow UI.

## Conventions

- UI language: Japanese
- Path alias: `@/*` maps to project root
- Two Button components: `components/common/Button.tsx` (custom) and `components/ui/button.tsx` (shadcn)
- Client API helpers follow `lib/api/*-client.ts` naming
- Bank account numbers are AES-256 encrypted in DB
- Timezone default: Asia/Tokyo

## Documentation

詳細な仕様は以下のドキュメントを参照:

- @DOCS/REQUIREMENTS.md — 要件定義書（機能要件・非機能要件・ロール・将来対応予定）
- @DOCS/DATABASE.md — データベース定義（ER図・テーブル定義・Enum・リレーション）
- @DOCS/SCREENS.md — 画面定義書（全画面一覧・画面遷移フロー・共通コンポーネント）
- @DOCS/API.md — API仕様書（全67エンドポイント・認証方式・Webhook仕様）
- @DOCS/TEST.md — テスト仕様書（テスト項目一覧・テスト環境・実行方法）
- @DOCS/TASKS.md — タスク一覧（実装済み・未実装TODO・技術的負債）
- @DOCS/EXTERNAL_BOOKING_API.md — 外部予約API設計書（パートナー連携の詳細設計）
- @DOCS/DEV_ENVIRONMENT_SETUP.md — 開発環境セットアップ詳細
