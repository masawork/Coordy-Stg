# 開発環境データリセット手順

本番運用前の開発環境で、Cognitoユーザーや Amplify Data のデータをリセットする手順をまとめています。

---

## ⚠️ 注意事項

- **本番環境では絶対に実行しないでください**
- データリセット後は復元できません
- リセット前に必要なデータがあればバックアップを取ってください

---

## 1. Cognito ユーザーの削除

### 方法1: AWS CLI を使用する（推奨）

#### すべてのユーザーを一括削除

```bash
# ユーザープールIDを取得（Amplify sandboxのログまたはAWSコンソールから確認）
USER_POOL_ID="ap-northeast-1_XXXXXXXXX"

# すべてのユーザーを取得して削除
aws cognito-idp list-users --user-pool-id $USER_POOL_ID --query 'Users[].Username' --output text | \
while read username; do
  echo "削除中: $username"
  aws cognito-idp admin-delete-user --user-pool-id $USER_POOL_ID --username $username
done

echo "✅ すべてのCognitoユーザーを削除しました"
```

#### 特定のユーザーのみ削除

```bash
USER_POOL_ID="ap-northeast-1_XXXXXXXXX"
EMAIL="test@example.com"

aws cognito-idp admin-delete-user \
  --user-pool-id $USER_POOL_ID \
  --username $EMAIL

echo "✅ ユーザー $EMAIL を削除しました"
```

### 方法2: AWS コンソールを使用する

1. [AWS Cognito コンソール](https://console.aws.amazon.com/cognito/)を開く
2. ユーザープールを選択
3. 「ユーザー」タブを開く
4. 削除したいユーザーを選択
5. 「ユーザーを削除」をクリック

---

## 2. Amplify Data (DynamoDB) のデータ削除

### ClientProfile の削除

Amplify sandboxで生成されたGraphQL APIを使用してデータを削除します。

#### 方法1: GraphQL Explorerを使用（推奨）

1. Amplify sandbox実行中に表示されるGraphQL Endpoint URLを開く
2. 以下のクエリで全ClientProfileを取得：

```graphql
query ListClientProfiles {
  listClientProfiles {
    items {
      id
      clientId
      name
    }
  }
}
```

3. 各プロフィールを削除：

```graphql
mutation DeleteClientProfile {
  deleteClientProfile(input: { id: "CLIENT_PROFILE_ID" }) {
    id
  }
}
```

#### 方法2: AWS CLIでDynamoDBテーブルを直接操作

```bash
# テーブル名を確認（Amplifyが自動生成）
aws dynamodb list-tables --query 'TableNames[?contains(@, `ClientProfile`)]'

# すべてのアイテムを削除（テーブル名は実際の名前に置き換える）
TABLE_NAME="ClientProfile-XXXXXXXXXX-sandbox"

aws dynamodb scan --table-name $TABLE_NAME --query 'Items[].id.S' --output text | \
while read id; do
  echo "削除中: $id"
  aws dynamodb delete-item --table-name $TABLE_NAME --key "{\"id\": {\"S\": \"$id\"}}"
done

echo "✅ すべてのClientProfileを削除しました"
```

### Instructor の削除

ClientProfileと同様の手順で削除できます：

```graphql
query ListInstructors {
  listInstructors {
    items {
      id
      userId
      displayName
    }
  }
}

mutation DeleteInstructor {
  deleteInstructor(input: { id: "INSTRUCTOR_ID" }) {
    id
  }
}
```

---

## 3. 完全リセット（すべてのデータを削除）

開発環境を完全にリセットする場合の手順：

### ステップ1: Amplify Sandboxを停止

```bash
# 実行中のsandboxを停止（Ctrl+C）
# または別ターミナルで：
pkill -f "ampx sandbox"
```

### ステップ2: すべてのCognitoユーザーを削除

```bash
USER_POOL_ID="ap-northeast-1_XXXXXXXXX"

aws cognito-idp list-users --user-pool-id $USER_POOL_ID --query 'Users[].Username' --output text | \
while read username; do
  aws cognito-idp admin-delete-user --user-pool-id $USER_POOL_ID --username $username
done
```

### ステップ3: DynamoDBデータをクリア

各テーブルを空にします（上記の手順を参照）。

### ステップ4: Amplify Sandboxを再起動

```bash
npx ampx sandbox
```

---

## 4. テストユーザーの再作成

リセット後、以下のテストユーザーを作成することを推奨します。

### ユーザー（クライアント）

- **メール**: `client-test@example.com`
- **パスワード**: `TestPass123!`
- **ロール**: `user`
- **グループ**: `CLIENTS`

### インストラクター（クリエイター）

- **メール**: `instructor-test@example.com`
- **パスワード**: `TestPass123!`
- **ロール**: `instructor`
- **グループ**: `CREATORS`

### 管理者

- **メール**: `admin-test@example.com`
- **パスワード**: `TestPass123!`
- **ロール**: `admin`
- **グループ**: `ADMINS`

### テストユーザー作成スクリプト（オプション）

```bash
#!/bin/bash
# create-test-users.sh

USER_POOL_ID="ap-northeast-1_XXXXXXXXX"

echo "📝 テストユーザーを作成中..."

# クライアントユーザー
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username "client-test@example.com" \
  --user-attributes Name=email,Value="client-test@example.com" Name=email_verified,Value=true Name=name,Value="テスト ユーザー" \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username "client-test@example.com" \
  --password "TestPass123!" \
  --permanent

aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username "client-test@example.com" \
  --group-name "CLIENTS"

echo "✅ クライアントユーザー作成完了"

# インストラクターユーザー
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username "instructor-test@example.com" \
  --user-attributes Name=email,Value="instructor-test@example.com" Name=email_verified,Value=true Name=name,Value="テスト インストラクター" \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username "instructor-test@example.com" \
  --password "TestPass123!" \
  --permanent

aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username "instructor-test@example.com" \
  --group-name "CREATORS"

echo "✅ インストラクターユーザー作成完了"

echo "✅ すべてのテストユーザー作成完了"
```

使用方法：
```bash
chmod +x create-test-users.sh
./create-test-users.sh
```

---

## 5. よくある質問

### Q: ユーザープールIDはどこで確認できますか？

A: 以下の方法で確認できます：
1. Amplify sandboxのログ出力に表示されます
2. AWS Cognitoコンソールから確認
3. `amplify_outputs.json` ファイルの `userPoolId` フィールド

### Q: データを削除してもテーブル構造は残りますか？

A: はい、DynamoDBテーブル自体は削除されず、データのみが削除されます。テーブル構造（スキーマ）は維持されます。

### Q: 本番環境で誤って実行してしまった場合は？

A: **即座にAWS管理者に連絡してください**。データは復元できない可能性が高いため、バックアップからの復元が必要です。

### Q: どのくらいの頻度でリセットすべきですか？

A: 以下のタイミングでリセットを推奨します：
- 大きなスキーマ変更の後
- テストデータが肥大化した場合
- 認証周りの変更をテストする前
- 本番デプロイ前の最終確認

---

## 6. トラブルシューティング

### エラー: `An error occurred (UserNotFoundException)`

→ ユーザーが既に削除されているか、usernameが間違っています。

### エラー: `An error occurred (ResourceNotFoundException)`

→ テーブル名が間違っているか、テーブルが存在しません。`aws dynamodb list-tables`で確認してください。

### エラー: `AccessDeniedException`

→ AWS CLIの認証情報が正しく設定されていません。`aws configure`で設定してください。

---

## 参考リンク

- [AWS Cognito CLI リファレンス](https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/)
- [AWS DynamoDB CLI リファレンス](https://docs.aws.amazon.com/cli/latest/reference/dynamodb/)
- [Amplify Gen2 ドキュメント](https://docs.amplify.aws/gen2/)
