/**
 * usersテーブルをクリアして、Supabase Authから再同期
 * 実行: npx tsx scripts/reset-and-sync.ts
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient, UserRole } from '@prisma/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const prisma = new PrismaClient();

async function resetAndSync() {
  try {
    console.log('🗑️  既存のusersテーブルデータを削除中...');
    
    // 関連データを先に削除（外部キー制約のため）
    await prisma.clientProfile.deleteMany({});
    await prisma.wallet.deleteMany({});
    await prisma.instructor.deleteMany({});
    await prisma.reservation.deleteMany({});
    await prisma.pointTransaction.deleteMany({});
    await prisma.favoriteCreator.deleteMany({});
    
    // usersテーブルをクリア
    await prisma.user.deleteMany({});
    
    console.log('✅ 既存データを削除しました');
    console.log('');
    
    console.log('🔄 Supabase Authのユーザーを取得中...');
    
    // Supabase Authのユーザーを取得
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      throw error;
    }

    console.log(`📊 ${users.length}人のユーザーが見つかりました`);
    console.log('');

    for (const user of users) {
      const role = user.user_metadata?.role || 'user';
      const name = user.user_metadata?.name || user.email?.split('@')[0] || 'ユーザー';

      // Prismaにユーザーを作成
      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email!,
          name,
          role: (role.toUpperCase() as UserRole),
        },
      });

      console.log(`✅ ${user.email} を同期しました`);
      console.log(`   ID: ${user.id}`);
      console.log(`   名前: ${name}`);
      console.log(`   ロール: ${role.toUpperCase()}`);
      console.log('');
    }

    console.log('🎉 同期完了！');
    console.log('');
    console.log('次のステップ:');
    console.log('1. http://localhost:3000/login/user でログイン');
    console.log('2. プロフィール設定ページで情報を入力');
    console.log('3. 保存して完了！');
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAndSync();

