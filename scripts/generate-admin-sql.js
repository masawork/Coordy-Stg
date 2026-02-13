#!/usr/bin/env node
/**
 * 管理者ロール設定SQL生成スクリプト
 * 
 * 使用方法:
 *   node scripts/generate-admin-sql.js
 * 
 * admin-user-info.txt から UUID とメールアドレスを読み取り、
 * set-admin-role.sql を生成します。
 */

const fs = require('fs');
const path = require('path');

const infoFile = path.join(__dirname, 'admin-user-info.txt');
const sqlFile = path.join(__dirname, 'set-admin-role.sql');

// admin-user-info.txt を読み取る
function readAdminInfo() {
  try {
    const content = fs.readFileSync(infoFile, 'utf-8');
    const lines = content.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('#');
    });

    if (lines.length === 0) {
      throw new Error('admin-user-info.txt にUUIDとメールアドレスが記載されていません');
    }

    // 最初の有効な行を取得
    const line = lines[0].trim();
    const match = line.match(/^([a-f0-9-]+)=(.+)$/i);
    
    if (!match) {
      throw new Error(`不正な形式です: ${line}\n形式: UUID=メールアドレス`);
    }

    return {
      uuid: match[1].trim(),
      email: match[2].trim()
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`ファイルが見つかりません: ${infoFile}`);
    }
    throw error;
  }
}

// SQLファイルを生成
function generateSQL(uuid, email) {
  const name = email.split('@')[0] || 'Admin';
  
  return `-- 管理者ロール設定SQL
-- 自動生成: ${new Date().toISOString()}
-- UUID: ${uuid}
-- Email: ${email}
-- 
-- 使用方法: Supabase Studio の SQL Editor で実行してください
-- 
-- 注意:
-- - INSERT/UPDATE文は「Success. No rows returned」と表示されます（正常です）
-- - 最後のSELECTクエリで実際のデータが表示されます

-- ========================================
-- public.usersにレコードを作成してロールをadminに設定
-- 実行結果: "Success. No rows returned"（正常）
-- ========================================
INSERT INTO public.users (id, email, name, role, created_at, updated_at)
VALUES (
  '${uuid}',
  '${email}',
  '${name}',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET 
  role = 'admin',
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  updated_at = NOW();

-- ========================================
-- auth.usersのメタデータにroleを追加
-- 実行結果: "Success. No rows returned"（正常）
-- ========================================
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', 'admin')
WHERE id = '${uuid}';

-- ========================================
-- 確認クエリ（以下が表示されます）
-- ========================================

-- public.usersの確認
-- 期待される出力:
-- | id                                   | email                          | role  |
-- |--------------------------------------|--------------------------------|-------|
-- | ${uuid} | ${email} | admin |
SELECT id, email, role FROM public.users WHERE id = '${uuid}';

-- auth.usersの確認
-- 期待される出力:
-- | id                                   | email                          | auth_role |
-- |--------------------------------------|--------------------------------|-----------|
-- | ${uuid} | ${email} | admin     |
SELECT id, email, raw_user_meta_data->>'role' AS auth_role
FROM auth.users
WHERE id = '${uuid}';
`;
}

// メイン処理
try {
  console.log('📋 admin-user-info.txt を読み取り中...');
  const { uuid, email } = readAdminInfo();
  
  console.log(`✅ UUID: ${uuid}`);
  console.log(`✅ Email: ${email}`);
  
  console.log('\n📝 SQLファイルを生成中...');
  const sql = generateSQL(uuid, email);
  
  fs.writeFileSync(sqlFile, sql, 'utf-8');
  
  console.log(`✅ SQLファイルを生成しました: ${sqlFile}`);
  console.log('\n📌 次のステップ:');
  console.log('   1. Supabase Studio (http://localhost:54323) にアクセス');
  console.log('   2. SQL Editor を開く');
  console.log('   3. 生成された set-admin-role.sql の内容をコピー＆ペースト');
  console.log('   4. 「Run」ボタンをクリック');
  console.log('');
} catch (error) {
  console.error('❌ エラー:', error.message);
  process.exit(1);
}

