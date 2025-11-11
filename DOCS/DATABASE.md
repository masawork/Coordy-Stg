# データベース設計詳細

## 概要

Coordy（コーディ）プラットフォームのデータベース設計詳細です。
Amazon DynamoDBを使用したNoSQLデータベース設計を採用します。

---

## DynamoDB設計方針

### 設計原則

1. **アクセスパターン駆動設計**: クエリパターンを先に定義し、テーブル設計を最適化
2. **Single Table Design**: 可能な限り単一テーブルで複数エンティティを管理
3. **GSI活用**: Global Secondary Indexで柔軟なクエリを実現
4. **効率的なキー設計**: Partition KeyとSort Keyで効率的なデータアクセス

### パフォーマンス目標

- 読み取りレイテンシ: < 10ms
- 書き込みレイテンシ: < 20ms
- スループット: オンデマンド課金（自動スケール）

---

## テーブル設計

### 1. Users テーブル

**テーブル名**: `coordy-users-{env}`

**主キー**:
- Partition Key: `userId` (String)

**属性**:
```typescript
{
  userId: string;           // ユーザーID (UUID)
  email: string;            // メールアドレス (Unique)
  name: string;             // ユーザー名
  role: string;             // ロール (user|instructor|admin)
  point: number;            // 残高ポイント
  membership: string;       // メンバーシップ (free|gold|platinum)
  createdAt: string;        // 作成日時 (ISO 8601)
  updatedAt: string;        // 更新日時 (ISO 8601)
}
```

**GSI (Global Secondary Index)**:

1. **EmailIndex**
   - Partition Key: `email` (String)
   - 用途: メールアドレスでのユーザー検索

2. **RoleIndex**
   - Partition Key: `role` (String)
   - Sort Key: `createdAt` (String)
   - 用途: ロール別ユーザー一覧取得

**アクセスパターン**:
- ユーザーIDで取得: `GetItem` (PK: userId)
- メールアドレスで検索: `Query` (GSI: EmailIndex)
- ロール別一覧: `Query` (GSI: RoleIndex)

---

### 2. Services テーブル

**テーブル名**: `coordy-services-{env}`

**主キー**:
- Partition Key: `serviceId` (String)

**属性**:
```typescript
{
  serviceId: string;        // サービスID (UUID)
  title: string;            // サービス名
  category: string;         // カテゴリ
  description: string;      // 説明
  duration: number;         // 所要時間（分）
  basePrice: number;        // 基本価格
  instructorSlots: {        // インストラクター別スロット
    instructorId: string;
    instructorName: string;
    price: number;
    schedule: {
      date: string;         // YYYY-MM-DD
      timeSlot: string;     // morning|afternoon|evening
      capacity: number;
      reserved: number;     // 予約数
    }[];
  }[];
  status: string;           // active|inactive
  createdAt: string;
  updatedAt: string;
}
```

**GSI**:

1. **CategoryIndex**
   - Partition Key: `category` (String)
   - Sort Key: `createdAt` (String)
   - 用途: カテゴリ別サービス一覧

2. **StatusIndex**
   - Partition Key: `status` (String)
   - Sort Key: `title` (String)
   - 用途: アクティブなサービス一覧

**アクセスパターン**:
- サービスIDで取得: `GetItem` (PK: serviceId)
- カテゴリ別一覧: `Query` (GSI: CategoryIndex)
- アクティブなサービス: `Query` (GSI: StatusIndex)

---

### 3. Reservations テーブル

**テーブル名**: `coordy-reservations-{env}`

**主キー**:
- Partition Key: `userId` (String)
- Sort Key: `reservationId` (String)

**属性**:
```typescript
{
  userId: string;           // ユーザーID
  reservationId: string;    // 予約ID (UUID)
  serviceId: string;        // サービスID
  instructorId: string;     // インストラクターID
  date: string;             // 予約日 (YYYY-MM-DD)
  timeSlot: string;         // 時間帯 (morning|afternoon|evening)
  status: string;           // reserved|completed|cancelled
  price: number;            // 支払い金額
  createdAt: string;
  updatedAt: string;
}
```

**GSI**:

1. **DateIndex**
   - Partition Key: `date` (String)
   - Sort Key: `timeSlot` (String)
   - 用途: 日付別予約一覧

2. **InstructorIndex**
   - Partition Key: `instructorId` (String)
   - Sort Key: `date` (String)
   - 用途: インストラクター別予約一覧

3. **ServiceIndex**
   - Partition Key: `serviceId` (String)
   - Sort Key: `date` (String)
   - 用途: サービス別予約一覧

**アクセスパターン**:
- ユーザー別予約一覧: `Query` (PK: userId)
- 日付別予約: `Query` (GSI: DateIndex)
- インストラクター別: `Query` (GSI: InstructorIndex)
- サービス別: `Query` (GSI: ServiceIndex)

---

### 4. Todos テーブル

**テーブル名**: `coordy-todos-{env}`

**主キー**:
- Partition Key: `userId` (String)
- Sort Key: `todoId` (String)

**属性**:
```typescript
{
  userId: string;           // ユーザーID
  todoId: string;           // ToDoID (UUID)
  title: string;            // タイトル
  date: string;             // 日付 (YYYY-MM-DD)
  priority: string;         // 優先度 (high|medium|low)
  category: string;         // カテゴリ
  isCompleted: boolean;     // 完了フラグ
  createdAt: string;
  updatedAt: string;
}
```

**GSI**:

1. **DateIndex**
   - Partition Key: `userId` (String)
   - Sort Key: `date` (String)
   - 用途: ユーザーの日付別ToDo一覧

2. **PriorityIndex**
   - Partition Key: `userId` (String)
   - Sort Key: `priority` (String)
   - 用途: ユーザーの優先度別ToDo一覧

**アクセスパターン**:
- ユーザー別ToDo一覧: `Query` (PK: userId)
- 日付別ToDo: `Query` (GSI: DateIndex)
- 優先度別ToDo: `Query` (GSI: PriorityIndex)

---

### 5. Payments テーブル

**テーブル名**: `coordy-payments-{env}`

**主キー**:
- Partition Key: `userId` (String)
- Sort Key: `paymentId` (String)

**属性**:
```typescript
{
  userId: string;           // ユーザーID
  paymentId: string;        // 支払いID (UUID)
  amount: number;           // 金額
  method: string;           // 決済方法 (stripe|charge)
  type: string;             // 種別 (deposit|usage)
  status: string;           // pending|completed|failed
  stripePaymentId?: string; // Stripe決済ID
  description: string;      // 説明
  createdAt: string;
  updatedAt: string;
}
```

**GSI**:

1. **TypeIndex**
   - Partition Key: `userId` (String)
   - Sort Key: `type` (String)
   - 用途: ユーザーの種別別支払い履歴

2. **DateIndex**
   - Partition Key: `userId` (String)
   - Sort Key: `createdAt` (String)
   - 用途: ユーザーの日付別支払い履歴

**アクセスパターン**:
- ユーザー別支払い履歴: `Query` (PK: userId)
- 種別別履歴: `Query` (GSI: TypeIndex)
- 日付別履歴: `Query` (GSI: DateIndex)

---

### 6. Instructors テーブル

**テーブル名**: `coordy-instructors-{env}`

**主キー**:
- Partition Key: `instructorId` (String)

**属性**:
```typescript
{
  instructorId: string;     // インストラクターID (UUID)
  userId: string;           // 関連ユーザーID
  name: string;             // 名前
  bio: string;              // 自己紹介
  specialties: string[];    // 専門分野
  image: string;            // プロフィール画像URL (S3)
  services: string[];       // 提供サービスID一覧
  rating: number;           // 評価 (0-5)
  reviewCount: number;      // レビュー数
  status: string;           // active|inactive
  createdAt: string;
  updatedAt: string;
}
```

**GSI**:

1. **UserIdIndex**
   - Partition Key: `userId` (String)
   - 用途: ユーザーIDからインストラクター情報取得

2. **StatusIndex**
   - Partition Key: `status` (String)
   - Sort Key: `rating` (Number)
   - 用途: アクティブなインストラクター一覧（評価順）

**アクセスパターン**:
- インストラクターID で取得: `GetItem` (PK: instructorId)
- ユーザーIDから取得: `Query` (GSI: UserIdIndex)
- アクティブ一覧: `Query` (GSI: StatusIndex)

---

## データモデル関連図

```mermaid
erDiagram
    USERS ||--o{ RESERVATIONS : "makes"
    USERS ||--o{ TODOS : "has"
    USERS ||--o{ PAYMENTS : "owns"
    USERS ||--o| INSTRUCTORS : "can be"

    INSTRUCTORS ||--o{ SERVICES : "provides"
    SERVICES ||--o{ RESERVATIONS : "includes"

    USERS {
        string userId PK
        string email UK
        string name
        string role
        number point
        string membership
    }

    INSTRUCTORS {
        string instructorId PK
        string userId FK
        string name
        string bio
        array specialties
    }

    SERVICES {
        string serviceId PK
        string title
        string category
        number duration
        number basePrice
    }

    RESERVATIONS {
        string userId PK
        string reservationId SK
        string serviceId FK
        string instructorId FK
        string date
        string status
    }

    TODOS {
        string userId PK
        string todoId SK
        string title
        string date
        boolean isCompleted
    }

    PAYMENTS {
        string userId PK
        string paymentId SK
        number amount
        string type
        string status
    }
```

---

## キャパシティ設計

### オンデマンドモード設定

すべてのテーブルはオンデマンド課金モードを使用します。

**利点**:
- 自動スケーリング
- 予測不要
- トラフィック変動に対応

**想定スループット**:
- 読み取り: ~1,000 RCU/秒
- 書き込み: ~500 WCU/秒

---

## バックアップ戦略

### Point-in-Time Recovery (PITR)

- **有効化**: 全テーブルで有効
- **保持期間**: 35日間
- **復旧時間**: < 1時間

### オンデマンドバックアップ

- **頻度**: 毎日自動実行
- **保持**: 30日間
- **リージョン間複製**: 有効（東京→大阪）

---

## セキュリティ設定

### 暗号化

- **保存時暗号化**: AWS管理キー (AES-256)
- **転送時暗号化**: TLS 1.2+

### アクセス制御

```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:GetItem",
    "dynamodb:PutItem",
    "dynamodb:UpdateItem",
    "dynamodb:Query"
  ],
  "Resource": "arn:aws:dynamodb:ap-northeast-1:*:table/coordy-*",
  "Condition": {
    "ForAllValues:StringEquals": {
      "dynamodb:LeadingKeys": ["${cognito-identity.amazonaws.com:sub}"]
    }
  }
}
```

### 監査ログ

- **CloudTrail**: すべてのDynamoDB APIコールを記録
- **CloudWatch Logs**: パフォーマンスメトリクス監視

---

## インデックス戦略

### GSI設計ガイドライン

1. **頻繁なクエリパターン**: GSI作成
2. **低頻度クエリ**: Scan（フィルタ付き）
3. **複合条件**: 複数GSIの組み合わせ

### LSI vs GSI

| 項目 | LSI | GSI |
|------|-----|-----|
| 作成タイミング | テーブル作成時のみ | いつでも |
| キー要件 | 同じPK必要 | 異なるPK可 |
| スループット | テーブルと共有 | 独立 |
| 使用場面 | 同一PKでの別ソート | 異なるPKでのクエリ |

**Coordyでの選択**: 柔軟性を優先し、GSIを主に使用

---

## データマイグレーション

### 初期データ投入

```typescript
// mock-data.ts
export const seedData = {
  users: [
    {
      userId: 'user-001',
      email: 'user01@example.com',
      name: '山田太郎',
      role: 'user',
      point: 5000,
      membership: 'gold'
    }
  ],
  instructors: [
    {
      instructorId: 'inst-001',
      userId: 'user-002',
      name: '田中先生',
      bio: 'ヨガインストラクター歴10年',
      specialties: ['ヨガ', 'ピラティス']
    }
  ]
};
```

### マイグレーションスクリプト

```bash
# スクリプト実行
npm run db:seed
npm run db:migrate
```

---

## モニタリング

### CloudWatch メトリクス

- **ConsumedReadCapacityUnits**: 読み取りキャパシティ消費
- **ConsumedWriteCapacityUnits**: 書き込みキャパシティ消費
- **UserErrors**: ユーザーエラー数
- **SystemErrors**: システムエラー数

### アラート設定

```yaml
alarms:
  - name: HighThrottleRate
    metric: UserErrors
    threshold: 10
    period: 300
    action: sns-topic-arn

  - name: HighLatency
    metric: SuccessfulRequestLatency
    threshold: 100ms
    period: 60
    action: sns-topic-arn
```

---

## パフォーマンス最適化

### ベストプラクティス

1. **バッチ操作**: `BatchGetItem`, `BatchWriteItem`を活用
2. **Projection Expression**: 必要な属性のみ取得
3. **Consistent Read**: 整合性が必要な場合のみ使用
4. **キャッシュ**: DynamoDB Accelerator (DAX) 検討（フェーズ2）

### クエリ最適化

```typescript
// 良い例: 必要な属性のみ取得
const params = {
  TableName: 'coordy-users-prod',
  Key: { userId: 'user-001' },
  ProjectionExpression: 'userId, name, email'
};

// 悪い例: すべての属性を取得
const params = {
  TableName: 'coordy-users-prod',
  Key: { userId: 'user-001' }
};
```

---

## 開発環境

### ローカル開発

```bash
# DynamoDB Local起動
docker run -p 8000:8000 amazon/dynamodb-local

# テーブル作成
aws dynamodb create-table \
  --table-name coordy-users-dev \
  --endpoint-url http://localhost:8000 \
  ...
```

### 環境別テーブル

- **開発**: `coordy-*-dev`
- **ステージング**: `coordy-*-staging`
- **本番**: `coordy-*-prod`

---

*最終更新日: 2025-10-11*
