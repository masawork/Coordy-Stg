"use client";

import { Amplify } from "aws-amplify";
import { signOut } from "aws-amplify/auth";
import outputs from "../../amplify_outputs.json";

/**
 * Amplify Client Configuration
 *
 * This file initializes Amplify configuration on the client side.
 * It should be imported once in the root layout to ensure proper initialization.
 *
 * Amplify Gen2 configuration includes:
 * - Auth (Cognito)
 * - API (GraphQL/AppSync)
 */

// セッションバージョンをチェックし、不一致なら全セッションをクリア
async function checkAndClearSessionIfNeeded(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    // セッションバージョンファイルを取得
    const response = await fetch('/session-version.json', {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      // ファイルが存在しない場合（本番環境）は無視
      return;
    }
    
    const data = await response.json();
    const serverVersion = data.version;
    
    if (!serverVersion) return;
    
    const SESSION_VERSION_KEY = 'coordy_session_version';
    const storedVersion = localStorage.getItem(SESSION_VERSION_KEY);
    
    if (storedVersion !== serverVersion) {
      console.log('🔄 セッションバージョン不一致 - 全セッションをクリアします');
      console.log(`   保存されたバージョン: ${storedVersion || '(なし)'}`);
      console.log(`   サーバーバージョン: ${serverVersion}`);
      
      // Amplify/Cognito のトークンをクリア
      try {
        await signOut({ global: true });
      } catch (e) {
        // サインアウトに失敗しても続行（セッションがない場合など）
      }
      
      // ローカルストレージのセッション情報をクリア
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('CognitoIdentityServiceProvider') ||
          key.startsWith('amplify') ||
          key.startsWith('aws.') ||
          key.startsWith('coordy_')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // sessionStorageもクリア（admin用）
      sessionStorage.clear();
      
      // 新しいバージョンを保存
      localStorage.setItem(SESSION_VERSION_KEY, serverVersion);
      
      console.log('✅ 全セッションをクリアしました - 再ログインが必要です');
    }
  } catch (error) {
    // ファイルが存在しない場合（本番環境）は無視
  }
}

// Amplify.configure() に直接 outputs を渡す
// Amplify Gen2 では amplify_outputs.json の形式がそのまま使える
Amplify.configure(outputs, {
  ssr: true,
});

// セッションバージョンチェックを実行
checkAndClearSessionIfNeeded();

console.log("✅ Amplify 初期化完了 (Auth + Data)");

export default Amplify;
