-- 管理者ロール設定SQL
-- 自動生成: 2026-01-02T07:40:56.458Z
-- UUID: 41b624d9-4285-4f95-a9bb-ef5f67a89364
-- Email: skmtwork0+admin0001@gmail.com
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
  '41b624d9-4285-4f95-a9bb-ef5f67a89364',
  'skmtwork0+admin0001@gmail.com',
  'skmtwork0+admin0001',
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
WHERE id = '41b624d9-4285-4f95-a9bb-ef5f67a89364';

-- ========================================
-- 確認クエリ（以下が表示されます）
-- ========================================

-- public.usersの確認
-- 期待される出力:
-- | id                                   | email                          | role  |
-- |--------------------------------------|--------------------------------|-------|
-- | 41b624d9-4285-4f95-a9bb-ef5f67a89364 | skmtwork0+admin0001@gmail.com | admin |
SELECT id, email, role FROM public.users WHERE id = '41b624d9-4285-4f95-a9bb-ef5f67a89364';

-- auth.usersの確認
-- 期待される出力:
-- | id                                   | email                          | auth_role |
-- |--------------------------------------|--------------------------------|-----------|
-- | 41b624d9-4285-4f95-a9bb-ef5f67a89364 | skmtwork0+admin0001@gmail.com | admin     |
SELECT id, email, raw_user_meta_data->>'role' AS auth_role
FROM auth.users
WHERE id = '41b624d9-4285-4f95-a9bb-ef5f67a89364';
