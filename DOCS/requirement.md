AIエージェントへ、以下のタスクを実施してください。

## タスク1: Amplify公式ドキュメントに基づくCognito実装

### 必須参照ドキュメント
https://docs.amplify.aws/react/build-a-backend/auth/set-up-auth/
このドキュメントを必ず確認し、最新のAmplify Gen2の認証実装方法に従ってください。

特に以下のセクションを重点的に確認：
1. Set up Amplify Auth
2. Configure authorization modes  
3. Set up user attributes
4. Configure login methods
5. Social sign-in（必要に応じて）

### 実装時の注意点
- `defineAuth`の最新の書き方を確認
- `amplify/auth/resource.ts`の正しい構造
- フロントエンドでの`Amplify.configure()`の設定方法
- `@aws-amplify/ui-react`コンポーネントの活用も検討

## タスク2: 権限別イメージカラーの確認と適用

### カラースキーム確認
1. まず`/mnt/Coordy/Coordy-Stg/DOCS/`配下のドキュメントを確認
```bash
grep -r "color\|カラー\|色\|blue\|green\|orange" /mnt/Coordy/Coordy-Stg/DOCS/
```

2. 見つからない場合は以下のカラースキームを適用：
```typescript
const COLOR_SCHEME = {
  user: {
    primary: '#3B82F6',    // blue-600
    hover: '#2563EB',      // blue-700
    light: '#DBEAFE',      // blue-100
    name: 'ユーザー'
  },
  instructor: {
    primary: '#10B981',    // green-600
    hover: '#059669',      // green-700
    light: '#D1FAE5',      // green-100
    name: 'インストラクター'
  },
  admin: {
    primary: '#F97316',    // orange-600
    hover: '#EA580C',      // orange-700
    light: '#FED7AA',      // orange-100
    name: '管理者'
  }
};
```

3. 全てのコンポーネントで統一的に使用

## タスク3: 「教えたい方」の表現変更

### 変更対象と新表現案
以下から最も適切なものを選んで統一的に適用：

**Option 1: スキル活用型**
- 「🌟 あなたのスキルを活かす」
- 「💼 スキルを収益化する」

**Option 2: プロフェッショナル型**  
- 「👨‍🏫 インストラクターになる」
- 「🎓 プロとして教える」

**Option 3: 知識共有型**
- 「📚 知識を共有する」
- 「💡 専門知識を伝える」

### 変更箇所
1. `InstructorBenefits.tsx`のタイトル
2. ヘッダーのボタンテキスト
3. ログイン画面の選択肢
4. その他「教えたい方」が使われている全ての箇所

## タスク4: 実装手順

### 1. ドキュメント確認とCognito設定
```bash
# 1. Amplify公式ドキュメントの内容に基づいて実装
# 2. 特にamplify/auth/resource.tsを正確に設定

# amplify/auth/resource.ts
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true
  },
  // カスタム属性でユーザータイプを管理
  userAttributes: {
    'custom:userType': {
      dataType: 'String',
      mutable: true,
    },
    'custom:role': {
      dataType: 'String', 
      mutable: false,
      // user | instructor | admin
    }
  },
  groups: [
    {
      name: 'USERS',
      description: 'User group'
    },
    {
      name: 'INSTRUCTORS',
      description: 'Instructor group'  
    },
    {
      name: 'ADMINS',
      description: 'Admin group'
    }
  ]
});
```

### 2. フロントエンド認証UI更新
```typescript
// カラースキームを適用したボタンスタイル
const getButtonStyle = (userType: 'user' | 'instructor' | 'admin') => {
  const colors = COLOR_SCHEME[userType];
  return {
    backgroundColor: colors.primary,
    ':hover': {
      backgroundColor: colors.hover
    }
  };
};
```

### 3. 表現の統一的な変更
全ファイルで以下を検索・置換：
- 「教えたい方」→ 選択した新表現
- 「教える側」→ 「インストラクター」
- その他関連表現の統一

## タスク5: 確認事項

実装完了後、以下を報告してください：

### 1. カラースキーム
- [ ] DOCSフォルダでカラー定義を発見したか
- [ ] 発見した場合：その内容
- [ ] 発見できなかった場合：デフォルトカラーを適用

### 2. Cognito実装
- [ ] 公式ドキュメントに従った実装完了
- [ ] ユーザーグループの設定完了
- [ ] カスタム属性の設定完了

### 3. 表現変更
- [ ] 「教えたい方」の新表現：＿＿＿＿＿
- [ ] 全箇所の変更完了

### 4. 動作確認
- [ ] ユーザー登録・ログイン動作
- [ ] インストラクター登録・ログイン動作
- [ ] 権限別の色分け表示

作業を開始してください。必ず最初にAmplifyの公式ドキュメントを確認してから実装を進めてください。