# トラブルシューティング

## ⚠️ 重要：開発環境は HTTP で動作します

### 正しいアクセス方法
このプロジェクトの開発環境は **HTTP** で動作しています。

✅ **正しい URL**: `http://localhost:3000`

❌ **誤った URL**: `https://localhost:3000`

### HTTPSでアクセスした場合のエラー
`https://localhost:3000` にアクセスすると、以下のエラーが表示されます：
```
このサイトは安全に接続できません
ERR_SSL_PROTOCOL_ERROR
```

**原因**: 開発サーバーはHTTPで起動しており、HTTPS証明書を持っていません。

**解決策**: 必ず `http://localhost:3000` でアクセスしてください。

### ローカル HTTPS化（今後の選択肢）
将来的にローカル開発環境をHTTPS化する場合は、以下の手順が必要です：

1. **mkcert をインストール**
   ```bash
   # Windows (Chocolatey)
   choco install mkcert

   # macOS (Homebrew)
   brew install mkcert
   ```

2. **ローカルCA を作成**
   ```bash
   mkcert -install
   ```

3. **localhost 用の証明書を生成**
   ```bash
   mkcert localhost 127.0.0.1 ::1
   ```

4. **Next.js の設定を変更**
   `package.json` の `dev` スクリプトを以下のように変更：
   ```json
   "dev": "next dev --experimental-https --experimental-https-key ./localhost+2-key.pem --experimental-https-cert ./localhost+2.pem"
   ```

**注意**: 現時点では、HTTPS化は不要です。開発は HTTP で進めてください。

---

## Chrome で「HTTP ERROR 431」が表示される場合

### 現象
Chrome で `http://localhost:3000` にアクセスすると、以下のエラーが表示される：
```
このページは動作していません
HTTP ERROR 431
```

### 原因
リクエストヘッダまたは Cookie のサイズが大きすぎるため、Chrome が接続を拒否しています。
これは、以下が原因で発生する可能性があります：
- AWS Amplify/Cognito の認証トークンが Cookie に保存されている
- 開発中に大量のlocalStorageデータが蓄積している

### 一時的な回避策

#### 方法1: Chrome のキャッシュとCookieをクリア
1. Chrome で `Ctrl + Shift + Delete` を押す
2. 「期間」を「全期間」に設定
3. 「Cookieと他のサイトデータ」と「キャッシュされた画像とファイル」にチェック
4. 「データを削除」をクリック
5. Chrome を再起動
6. `http://localhost:3000` にアクセス

#### 方法2: Chrome DevTools から localStorageをクリア
1. Chrome で `http://localhost:3000` を開く（エラーが出ても開いたままにする）
2. `F12` キーを押して DevTools を開く
3. 「Application」タブをクリック
4. 左メニューの「Storage」→「Local Storage」→ `http://localhost:3000` を選択
5. 右クリック → 「Clear」
6. 同様に「Session Storage」と「Cookies」もクリア
7. ページをリロード

#### 方法3: シークレットモードで開く
1. Chrome で `Ctrl + Shift + N` を押す
2. シークレットウィンドウで `http://localhost:3000` にアクセス

### 恒久的な対策（開発者向け）
- Amplify Auth の Cookie設定を最適化する
- 不要なデータを localStorage に保存しない
- セッション情報を圧縮する
- トークンのサイズを最小化する

### 注意事項
- **開発サーバーはポート3000で起動しています**
- **必ず http:// でアクセスしてください（https:// ではありません）**
- 上記の手順を実施すると、ログイン状態が解除されます
