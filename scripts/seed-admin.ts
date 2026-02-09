/**
 * 管理者ユーザーをシードするスクリプト
 * 使用方法: npx ts-node scripts/seed-admin.ts
 * または: npm run seed:admin
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

// .env.local から環境変数を読み込む（既存の値を上書き）
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        if (key && value) {
          process.env[key] = value; // 強制的に上書き
        }
      }
    });
  }
}

loadEnvFile();

const prisma = new PrismaClient();

// ローカル開発用のSupabase設定（明示的にローカルURLをデフォルトに）
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1')
  ? process.env.NEXT_PUBLIC_SUPABASE_URL
  : 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// 作成する管理者アカウント
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456';
const ADMIN_NAME = process.env.ADMIN_NAME || '管理者';

// --reset オプションの確認
const RESET_MODE = process.argv.includes('--reset');

async function seedAdmin() {
  console.log('🚀 管理者シード開始...');
  if (RESET_MODE) {
    console.log('⚠️ リセットモード: 既存の管理者を削除して再作成します');
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY が設定されていません');
    console.log('ヒント: supabase status で service_role key を確認してください');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // リセットモードの場合は既存データを削除
    if (RESET_MODE) {
      await deleteExistingAdmin(supabase);
    }

    // 1. 既存の管理者を確認
    const existingAdmin = await prisma.user.findFirst({
      where: {
        email: ADMIN_EMAIL,
        role: 'ADMIN',
      },
    });

    if (existingAdmin) {
      console.log('✅ 管理者は既に存在します:', ADMIN_EMAIL);
      console.log('ヒント: --reset オプションで再作成できます');
      return;
    }

    // 2. Supabase Authにユーザーを作成
    console.log('📧 Supabase Authユーザーを作成中...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // メール確認済みとして作成
      user_metadata: {
        name: ADMIN_NAME,
        role: 'admin',
      },
    });

    if (authError) {
      // ユーザーが既に存在する場合
      if (authError.message.includes('already been registered')) {
        console.log('ℹ️ Supabase Authユーザーは既に存在します。パスワードを更新します...');
        // 既存ユーザーを取得してパスワード更新
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingAuthUser = users?.users.find(u => u.email === ADMIN_EMAIL);
        if (existingAuthUser) {
          // パスワードを更新
          await supabase.auth.admin.updateUserById(existingAuthUser.id, {
            password: ADMIN_PASSWORD,
          });
          console.log('✅ パスワードを更新しました');
          await createPrismaAdmin(existingAuthUser.id);
        }
        return;
      }
      throw authError;
    }

    if (!authData.user) {
      throw new Error('ユーザー作成に失敗しました');
    }

    console.log('✅ Supabase Authユーザー作成完了:', authData.user.id);

    // 3. Prismaにユーザーを作成
    await createPrismaAdmin(authData.user.id);

    console.log('\n🎉 管理者シード完了!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${ADMIN_EMAIL}`);
    console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function createPrismaAdmin(authId: string) {
  console.log('💾 Prismaユーザーを作成中...');

  // 既存のPrismaユーザーを確認
  const existing = await prisma.user.findFirst({
    where: {
      email: ADMIN_EMAIL,
      role: 'ADMIN',
    },
  });

  if (existing) {
    console.log('ℹ️ Prismaユーザーは既に存在します:', existing.id);
    return;
  }

  const admin = await prisma.user.create({
    data: {
      authId,
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  });

  console.log('✅ Prismaユーザー作成完了:', admin.id);
}

async function deleteExistingAdmin(supabase: any) {
  console.log('🗑️ 既存の管理者を削除中...');

  // Prismaから削除
  const existingPrisma = await prisma.user.findFirst({
    where: {
      email: ADMIN_EMAIL,
      role: 'ADMIN',
    },
  });

  if (existingPrisma) {
    await prisma.user.delete({
      where: { id: existingPrisma.id },
    });
    console.log('✅ Prismaユーザーを削除しました');
  }

  // Supabase Authから削除
  const { data: users } = await supabase.auth.admin.listUsers();
  const existingAuth = users?.users.find((u: any) => u.email === ADMIN_EMAIL);

  if (existingAuth) {
    await supabase.auth.admin.deleteUser(existingAuth.id);
    console.log('✅ Supabase Authユーザーを削除しました');
  }
}

// スクリプト実行
seedAdmin();
