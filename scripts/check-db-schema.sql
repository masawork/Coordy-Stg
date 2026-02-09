-- データベーススキーマの確認スクリプト
-- Supabase Studio の SQL Editor で実行してください

-- 1. users テーブルの構造を確認
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 2. auth_id カラムの存在確認
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.columns 
  WHERE table_name = 'users' 
  AND column_name = 'auth_id'
) AS auth_id_exists;

-- 3. email_role ユニーク制約の確認
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'users'
AND constraint_type = 'UNIQUE';

-- 4. email_role インデックスの確認
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'users'
AND indexname LIKE '%email%role%';

-- 5. 既存ユーザーの確認（auth_id が NULL のユーザーを確認）
SELECT 
  id,
  email,
  role,
  auth_id,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

