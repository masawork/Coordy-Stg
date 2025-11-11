# 認証・セキュリティ設計

## 概要

Coordy（コーディ）プラットフォームの認証・セキュリティ設計書です。
Amazon Cognitoを中心とした認証基盤とセキュリティ対策を定義します。

---

## 認証アーキテクチャ

### 全体構成

```mermaid
graph TB
    Client[クライアント]
    NextJS[Next.js App Router]
    Cognito[Amazon Cognito]
    API[API Routes]
    DynamoDB[(DynamoDB)]

    Client -->|1. ログイン| NextJS
    NextJS -->|2. 認証リクエスト| Cognito
    Cognito -->|3. JWT発行| NextJS
    NextJS -->|4. トークン保存| Client
    Client -->|5. API呼び出し + JWT| API
    API -->|6. トークン検証| Cognito
    API -->|7. データアクセス| DynamoDB
```

---

## Amazon Cognito設定

### ユーザープール構成

**プール名**: `coordy-user-pool-{env}`

**属性設定**:
```json
{
  "標準属性": {
    "email": {
      "required": true,
      "mutable": true
    },
    "name": {
      "required": true,
      "mutable": true
    }
  },
  "カスタム属性": {
    "custom:role": {
      "type": "String",
      "mutable": true
    },
    "custom:userId": {
      "type": "String",
      "mutable": false
    }
  }
}
```

### パスワードポリシー

```json
{
  "minimumLength": 8,
  "requireLowercase": true,
  "requireUppercase": true,
  "requireNumbers": true,
  "requireSymbols": false,
  "temporaryPasswordValidityDays": 7
}
```

### MFA設定

```json
{
  "mfaConfiguration": "OPTIONAL",
  "enabledMfas": ["SOFTWARE_TOKEN_MFA"],
  "smsConfiguration": {
    "snsRegion": "ap-northeast-1"
  }
}
```

---

## 認証フロー

### 1. ユーザー登録フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant C as クライアント
    participant N as Next.js
    participant CG as Cognito
    participant DB as DynamoDB

    U->>C: 登録フォーム入力
    C->>N: POST /api/auth/register
    N->>CG: SignUp API
    CG->>U: 確認コード送信（メール）
    U->>C: 確認コード入力
    C->>N: POST /api/auth/verify
    N->>CG: ConfirmSignUp API
    CG-->>N: 成功
    N->>DB: ユーザー情報保存
    N-->>C: 登録完了
```

### 2. ログインフロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant C as クライアント
    participant N as Next.js
    participant CG as Cognito

    U->>C: ログインフォーム入力
    C->>N: POST /api/auth/login
    N->>CG: InitiateAuth API
    CG-->>N: JWT + RefreshToken
    N->>C: トークン返却 + Cookie設定
    C->>C: トークン保存（localStorage）
    C-->>U: ダッシュボードへリダイレクト
```

### 3. トークンリフレッシュフロー

```mermaid
sequenceDiagram
    participant C as クライアント
    participant N as Next.js
    participant CG as Cognito

    C->>N: API呼び出し（期限切れトークン）
    N-->>C: 401 Unauthorized
    C->>N: POST /api/auth/refresh
    N->>CG: RefreshToken送信
    CG-->>N: 新しいJWT
    N-->>C: 新しいトークン
    C->>N: API再実行（新しいトークン）
```

---

## ロールベースアクセス制御（RBAC）

### ロール定義

| ロール | 権限レベル | アクセス範囲 |
|--------|-----------|-------------|
| **user** | 1 | 自身のデータのみ |
| **instructor** | 2 | 自身のサービス・顧客データ |
| **admin** | 3 | 全データアクセス |

### 権限マトリックス

| リソース | user | instructor | admin |
|---------|------|-----------|-------|
| 自分のプロフィール | R/W | R/W | R/W |
| 他ユーザーのプロフィール | - | - | R/W |
| サービス閲覧 | R | R | R/W |
| サービス作成 | - | R/W | R/W |
| 予約作成 | R/W | - | R/W |
| 予約管理（自分） | R/W | R | R/W |
| 予約管理（全体） | - | - | R/W |
| 支払い（自分） | R/W | - | R/W |
| 支払い（全体） | - | - | R |

**凡例**: R=読み取り、W=書き込み、-=アクセス不可

---

## Middleware実装

### middleware.ts

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const path = request.nextUrl.pathname;

  // 認証が必要なパス
  const protectedPaths = ['/user', '/instructor', '/admin'];
  const isProtectedPath = protectedPaths.some(p => path.startsWith(p));

  if (isProtectedPath && !token) {
    // 未認証の場合、ログインページへリダイレクト
    const role = path.split('/')[1];
    return NextResponse.redirect(new URL(`/${role}/login`, request.url));
  }

  if (token) {
    try {
      // トークン検証
      const payload = await verifyToken(token);
      const userRole = payload['custom:role'];
      const pathRole = path.split('/')[1];

      // ロールチェック
      if (userRole !== pathRole && userRole !== 'admin') {
        return NextResponse.redirect(new URL(`/${userRole}`, request.url));
      }

      // リクエストヘッダーにユーザー情報を追加
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', payload['custom:userId']);
      requestHeaders.set('x-user-role', userRole);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      // トークンが無効な場合
      return NextResponse.redirect(new URL('/user/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## トークン管理

### JWT構造

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "..."
  },
  "payload": {
    "sub": "user-123",
    "email": "user@example.com",
    "custom:role": "user",
    "custom:userId": "user-123",
    "iat": 1634567890,
    "exp": 1634571490
  }
}
```

### トークン保存

**クライアント側**:
```typescript
// localStorage (アクセストークン)
localStorage.setItem('access_token', token);

// Cookie (リフレッシュトークン - HttpOnly)
// サーバー側で設定
```

**セキュリティ設定**:
```typescript
// Cookie設定
res.setHeader('Set-Cookie', [
  `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`
]);
```

### トークン有効期限

- **アクセストークン**: 1時間
- **リフレッシュトークン**: 7日間
- **IDトークン**: 1時間

---

## セキュリティ対策

### 1. HTTPS強制

```typescript
// next.config.ts
export default {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          }
        ]
      }
    ];
  }
};
```

### 2. CSRF対策

```typescript
// lib/csrf.ts
import { randomBytes } from 'crypto';

export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

export function verifyCsrfToken(token: string, expected: string): boolean {
  return token === expected;
}

// APIルート
export async function POST(request: Request) {
  const csrfToken = request.headers.get('X-CSRF-Token');
  const sessionToken = request.cookies.get('csrf_token')?.value;

  if (!csrfToken || csrfToken !== sessionToken) {
    return new Response('Invalid CSRF token', { status: 403 });
  }

  // 処理続行
}
```

### 3. XSS対策

```typescript
// Content Security Policy
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

// next.config.ts
headers: [
  {
    key: 'Content-Security-Policy',
    value: cspHeader.replace(/\n/g, '')
  }
]
```

### 4. レート制限

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100req/min
});

// APIルート
export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return new Response('Too Many Requests', { status: 429 });
  }

  // 処理続行
}
```

### 5. 入力検証

```typescript
// lib/validation.ts
import { z } from 'zod';

// ユーザー登録スキーマ
export const registerSchema = z.object({
  name: z.string().min(1).max(50),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
  role: z.enum(['user', 'instructor', 'admin'])
});

// APIルート
export async function POST(request: Request) {
  const body = await request.json();

  try {
    const validatedData = registerSchema.parse(body);
    // 処理続行
  } catch (error) {
    return new Response('Validation Error', { status: 400 });
  }
}
```

---

## セッション管理

### セッションストア

```typescript
// lib/session.ts
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function createSession(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}
```

### セッションタイムアウト

- **アイドルタイムアウト**: 30分
- **絶対タイムアウト**: 24時間
- **自動延長**: APIアクセス時に自動延長

---

## 監査ログ

### ログ記録項目

```typescript
interface AuditLog {
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure';
  details?: any;
}

// 例
{
  timestamp: '2025-10-11T10:30:00Z',
  userId: 'user-123',
  action: 'LOGIN',
  resource: '/api/auth/login',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  status: 'success'
}
```

### 記録対象イベント

- ログイン・ログアウト
- ユーザー登録
- パスワード変更
- ロール変更
- データアクセス（管理者）
- 決済処理
- 重要データの変更

### ログ保存先

- **CloudWatch Logs**: リアルタイムモニタリング
- **S3**: 長期保存（1年間）
- **検索**: CloudWatch Insights

---

## パスワード管理

### パスワードリセットフロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant C as クライアント
    participant N as Next.js
    participant CG as Cognito

    U->>C: パスワードリセット要求
    C->>N: POST /api/auth/forgot-password
    N->>CG: ForgotPassword API
    CG->>U: 確認コード送信（メール）
    U->>C: 確認コード + 新パスワード入力
    C->>N: POST /api/auth/confirm-password
    N->>CG: ConfirmForgotPassword API
    CG-->>N: 成功
    N-->>C: パスワードリセット完了
```

### パスワードハッシュ

- **アルゴリズム**: bcrypt
- **ソルトラウンド**: 10
- **Cognito管理**: パスワードはCognitoで暗号化保存

---

## セキュリティヘッダー

### 推奨設定

```typescript
// next.config.ts
export default {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  }
};
```

---

## セキュリティチェックリスト

### 開発時

- [ ] すべてのAPIエンドポイントに認証を実装
- [ ] ロールベース認証の実装
- [ ] 入力検証の実装
- [ ] CSRF対策の実装
- [ ] レート制限の実装

### デプロイ前

- [ ] HTTPS強制の確認
- [ ] セキュリティヘッダーの設定
- [ ] 環境変数の適切な管理
- [ ] 秘密鍵のローテーション計画
- [ ] 監査ログの有効化

### 運用時

- [ ] 定期的なセキュリティ監査
- [ ] 脆弱性スキャン（月次）
- [ ] アクセスログの監視
- [ ] インシデント対応手順の整備
- [ ] セキュリティパッチの適用

---

## インシデント対応

### 対応フロー

1. **検知**: モニタリングアラート
2. **初動**: 影響範囲の特定
3. **封じ込め**: 不正アクセスのブロック
4. **根絶**: 脆弱性の修正
5. **復旧**: サービスの正常化
6. **事後対応**: 原因分析・再発防止

### エスカレーション

- **Level 1**: 自動アラート → オンコール担当者
- **Level 2**: 重大インシデント → チームリーダー
- **Level 3**: 緊急事態 → 経営層

---

*最終更新日: 2025-10-11*
