# サンプルデータ投入ガイド

## 概要

Coordyアプリケーションの動作確認とデモ用に、サンプルのインストラクターとサービスデータを投入するためのガイドです。

## サンプルデータ内容

### インストラクター（3名）

#### 1. 山田ヨガ（ヨガ系）
- **専門分野**: ヨガ、ストレッチ、リラクゼーション
- **時給**: 5,000円
- **評価**: 4.8 / 5.0 (156件のレビュー)
- **提供サービス**: 3件
  - 朝ヨガで心と体をリフレッシュ（60分 / 3,000pt）
  - パワーヨガで体幹強化（90分 / 4,500pt）
  - リストラティブヨガで深いリラックス（60分 / 3,500pt）

#### 2. 佐藤トレーナー（筋トレ・パーソナルトレーニング系）
- **専門分野**: 筋トレ、ダイエット、パーソナルトレーニング
- **時給**: 8,000円
- **評価**: 4.9 / 5.0 (203件のレビュー)
- **提供サービス**: 3件
  - パーソナル筋トレ指導（60分 / 8,000pt）
  - ダイエット集中プログラム（90分 / 10,000pt）
  - 初心者向け筋トレ入門（60分 / 6,000pt）

#### 3. 鈴木ピラティス（ピラティス・ストレッチ系）
- **専門分野**: ピラティス、ストレッチ、姿勢改善
- **時給**: 6,000円
- **評価**: 4.7 / 5.0 (89件のレビュー)
- **提供サービス**: 3件
  - ピラティス基礎レッスン（60分 / 4,000pt）
  - 体幹強化ピラティス（75分 / 5,000pt）
  - ストレッチ&ピラティス（60分 / 4,500pt）

### 合計
- **インストラクター**: 3名
- **サービス**: 9件（ヨガ3件、筋トレ3件、ピラティス3件）

## データ投入方法

### 前提条件

1. Amplify Gen2環境が正しくセットアップされていること
2. バックエンドがデプロイされていること
3. 必要な環境変数が設定されていること

### 環境変数の設定

`.env.local`ファイルに以下の環境変数を設定してください：

```env
NEXT_PUBLIC_AMPLIFY_GRAPHQL_ENDPOINT=your-graphql-endpoint
NEXT_PUBLIC_AMPLIFY_REGION=ap-northeast-1
NEXT_PUBLIC_AMPLIFY_API_KEY=your-api-key
```

これらの値は、Amplify CLIの出力またはAWSコンソールから取得できます。

### スクリプト実行

```bash
# 依存関係がインストールされていない場合
npm install tsx --save-dev

# スクリプト実行
npx tsx scripts/seed-services.ts
```

### 実行結果の例

```
🌱 サンプルデータ投入を開始します...

👤 インストラクターデータを投入中...
✅ 山田ヨガを作成しました (ID: abc123...)
✅ 佐藤トレーナーを作成しました (ID: def456...)
✅ 鈴木ピラティスを作成しました (ID: ghi789...)

✅ 3人のインストラクターを作成しました

🎯 サービスデータを投入中...
✅ 朝ヨガで心と体をリフレッシュを作成しました (ID: jkl012...)
✅ パワーヨガで体幹強化を作成しました (ID: mno345...)
...（省略）...

✅ 9件のサービスを作成しました

🎉 サンプルデータ投入が完了しました！

📊 投入結果:
   - インストラクター: 3人
   - サービス: 9件

✨ 完了しました
```

## データの確認

### ダッシュボードで確認

1. クライアントとしてログイン
2. `/user`ダッシュボードにアクセス
3. 「あなたへのおすすめサービス」セクションに投入されたサービスが表示されることを確認

### サービス検索で確認

1. サイドバーから「サービス検索」をクリック
2. カテゴリー別にサービスが表示されることを確認
   - ヨガ: 3件
   - パーソナルトレーニング: 3件
   - ピラティス: 3件

### データベースで直接確認（開発者向け）

AWS AppSync コンソールまたはAmplify Data マネージャーから、以下のクエリを実行できます：

```graphql
query ListInstructors {
  listInstructors {
    items {
      id
      displayName
      specialties
      rating
      reviewCount
    }
  }
}

query ListServices {
  listServices {
    items {
      id
      title
      category
      duration
      basePrice
      status
      instructorId
    }
  }
}
```

## データのクリア（リセット）

サンプルデータをクリアしたい場合は、AWS AppSyncコンソールから手動で削除するか、以下のようなスクリプトを作成してください：

```typescript
// scripts/clear-sample-data.ts
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';

// Amplify設定...

async function clearData() {
  const client = generateClient();

  // サービスを削除
  const { data: services } = await client.models.Service.list();
  for (const service of services || []) {
    await client.models.Service.delete({ id: service.id });
  }

  // インストラクターを削除
  const { data: instructors } = await client.models.Instructor.list();
  for (const instructor of instructors || []) {
    await client.models.Instructor.delete({ id: instructor.id });
  }
}
```

## トラブルシューティング

### エラー: "Client could not be generated"

**原因**: Amplify設定が正しくない、または環境変数が設定されていない

**解決策**:
1. `.env.local`ファイルの環境変数を確認
2. `amplify/outputs.json`が生成されているか確認
3. バックエンドが正しくデプロイされているか確認

### エラー: "Authorization error"

**原因**: 認証モードの設定が正しくない

**解決策**:
1. スクリプト内の`defaultAuthMode`を`'apiKey'`に設定
2. APIキーが有効期限内であることを確認
3. 必要に応じて`amplify/data/resource.ts`の認可設定を確認

### サービスが表示されない

**原因**: サービスのステータスが`'published'`でない可能性

**解決策**:
1. データ投入スクリプトで`status: 'published'`が設定されているか確認
2. サービス一覧取得時のフィルター条件を確認

## カスタマイズ

### 独自のサンプルデータを追加

`scripts/seed-services.ts`の`sampleInstructors`と`sampleServices`配列を編集することで、独自のサンプルデータを追加できます。

```typescript
const sampleInstructors = [
  {
    userId: 'instructor-d-001',
    displayName: 'あなたのインストラクター名',
    bio: '説明文...',
    specialties: ['専門分野1', '専門分野2'],
    hourlyRate: 7000,
    rating: 4.5,
    reviewCount: 50,
    status: 'active',
  },
  // ... 他のインストラクター
];
```

### サービスカテゴリー

現在サポートされているカテゴリー：
- `yoga`: ヨガ
- `personalTraining`: パーソナルトレーニング
- `pilates`: ピラティス
- その他: データスキーマで定義されたカテゴリー

## 本番環境での注意事項

⚠️ **重要**: このスクリプトは開発・テスト環境専用です。本番環境では以下に注意してください：

1. **本番データとの混在を避ける**: サンプルデータと実際のユーザーデータが混在しないようにする
2. **認証モード**: 本番環境では`apiKey`モードではなく、適切な認証方式を使用
3. **データ検証**: 投入前にデータの整合性を確認
4. **バックアップ**: データ投入前に必ずバックアップを取る

## 参考資料

- [Amplify Gen2 Data Documentation](https://docs.amplify.aws/gen2/build-a-backend/data/)
- [Amplify Auth Documentation](https://docs.amplify.aws/gen2/build-a-backend/auth/)
- [プロジェクト認証フロー](./AUTHENTICATION_FLOW.md)
- [サインアップテストガイド](./SIGNUP_TEST_GUIDE.md)
