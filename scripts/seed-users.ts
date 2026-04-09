/**
 * テスト用ユーザー（USER/INSTRUCTOR）をシードするスクリプト
 * 使用方法: npx tsx scripts/seed-users.ts
 * または: npm run seed:users
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

// .env.local から環境変数を読み込む
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
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnvFile();

const prisma = new PrismaClient();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1')
  ? process.env.NEXT_PUBLIC_SUPABASE_URL
  : 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// 作成するアカウント
const ACCOUNTS = [
  {
    email: 'user@example.com',
    password: 'user123456',
    name: 'テストユーザー',
    role: 'USER' as const,
  },
  {
    email: 'instructor@example.com',
    password: 'instructor123456',
    name: 'テストサービス提供者',
    role: 'INSTRUCTOR' as const,
  },
];

const RESET_MODE = process.argv.includes('--reset');

async function seedUsers() {
  console.log('🚀 テストユーザーシード開始...');
  if (RESET_MODE) {
    console.log('⚠️ リセットモード: 既存ユーザーを削除して再作成します');
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
    for (const account of ACCOUNTS) {
      console.log(`\n--- ${account.role}: ${account.email} ---`);

      if (RESET_MODE) {
        await deleteExistingUser(supabase, account.email, account.role);
      }

      // 1. Prismaに既存ユーザーがあるか確認
      const existingPrisma = await prisma.user.findFirst({
        where: { email: account.email, role: account.role },
      });

      if (existingPrisma) {
        console.log(`✅ ${account.role} は既に存在します: ${account.email}`);
        console.log('ヒント: --reset オプションで再作成できます');
        continue;
      }

      // 2. Supabase Auth にユーザーを作成
      console.log('📧 Supabase Auth ユーザーを作成中...');
      let authId: string;

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          name: account.name,
          role: account.role.toLowerCase(),
        },
      });

      if (authError) {
        if (authError.message.includes('already been registered')) {
          console.log('ℹ️ Supabase Auth ユーザーは既に存在。パスワードを更新します...');
          const { data: users } = await supabase.auth.admin.listUsers();
          const existingAuth = users?.users.find(u => u.email === account.email);
          if (existingAuth) {
            await supabase.auth.admin.updateUserById(existingAuth.id, {
              password: account.password,
            });
            authId = existingAuth.id;
            console.log('✅ パスワード更新完了');
          } else {
            throw new Error(`Auth ユーザーが見つかりません: ${account.email}`);
          }
        } else {
          throw authError;
        }
      } else {
        if (!authData.user) throw new Error('ユーザー作成に失敗');
        authId = authData.user.id;
        console.log('✅ Supabase Auth ユーザー作成完了:', authId);
      }

      // 3. Prisma にユーザーを作成
      console.log('💾 Prisma ユーザーを作成中...');
      const user = await prisma.user.create({
        data: {
          authId: authId!,
          email: account.email,
          name: account.name,
          role: account.role,
          emailVerified: new Date(),
        },
      });
      console.log('✅ Prisma ユーザー作成完了:', user.id);

      // 4. INSTRUCTOR の場合は Instructor レコードも作成
      if (account.role === 'INSTRUCTOR') {
        const existingInstructor = await prisma.instructor.findUnique({
          where: { userId: user.id },
        });
        if (!existingInstructor) {
          await prisma.instructor.create({
            data: {
              userId: user.id,
              bio: 'テスト用サービス提供者です。',
              specialties: ['ヨガ', 'ピラティス'],
              hourlyRate: 3000,
              isVerified: true,
            },
          });
          console.log('✅ Instructor レコード作成完了');
        }
      }

      // 5. USER の場合は ClientProfile + Wallet を作成
      if (account.role === 'USER') {
        const existingProfile = await prisma.clientProfile.findUnique({
          where: { userId: user.id },
        });
        if (!existingProfile) {
          await prisma.clientProfile.create({
            data: {
              userId: user.id,
              fullName: account.name,
              verificationLevel: 0,
            },
          });
          console.log('✅ ClientProfile 作成完了');
        }

        const existingWallet = await prisma.wallet.findUnique({
          where: { userId: user.id },
        });
        if (!existingWallet) {
          await prisma.wallet.create({
            data: {
              userId: user.id,
              balance: 10000, // テスト用に10,000ポイント付与
            },
          });
          console.log('✅ Wallet 作成完了（残高: 10,000pt）');
        }
      }
    }

    console.log('\n🎉 テストユーザーシード完了!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const account of ACCOUNTS) {
      console.log(`📧 ${account.role}: ${account.email} / ${account.password}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function deleteExistingUser(supabase: any, email: string, role: string) {
  console.log(`🗑️ 既存の ${role} を削除中...`);

  // Prisma から削除（関連データも）
  const existing = await prisma.user.findFirst({
    where: { email, role: role as any },
  });

  if (existing) {
    if (role === 'INSTRUCTOR') {
      // Instructor レコードを先に削除
      await prisma.instructor.deleteMany({ where: { userId: existing.id } });
    }
    if (role === 'USER') {
      await prisma.clientProfile.deleteMany({ where: { userId: existing.id } });
      await prisma.wallet.deleteMany({ where: { userId: existing.id } });
    }
    await prisma.user.delete({ where: { id: existing.id } });
    console.log('✅ Prisma ユーザーを削除しました');
  }

  // Supabase Auth から削除（同じメールの他ロールと共有されている場合は削除しない）
  const otherRoles = await prisma.user.findMany({
    where: { email, role: { not: role as any } },
  });
  if (otherRoles.length === 0) {
    const { data: users } = await supabase.auth.admin.listUsers();
    const authUser = users?.users.find((u: any) => u.email === email);
    if (authUser) {
      await supabase.auth.admin.deleteUser(authUser.id);
      console.log('✅ Supabase Auth ユーザーを削除しました');
    }
  } else {
    console.log('ℹ️ 他のロールが存在するため Auth ユーザーは保持します');
  }
}

seedUsers();
