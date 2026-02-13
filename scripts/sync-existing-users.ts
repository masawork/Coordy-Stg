/**
 * 既存Supabase Authユーザーを Prismaのusersテーブルに同期
 * 実行: npx tsx scripts/sync-existing-users.ts
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

async function syncUsers() {
  try {
    console.log('🔄 Supabase Authのユーザーを取得中...');
    
    // Supabase Authのユーザーを取得
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      throw error;
    }

    console.log(`📊 ${users.length}人のユーザーが見つかりました`);

    for (const user of users) {
      const role = user.user_metadata?.role || 'user';
      const name = user.user_metadata?.name || user.email?.split('@')[0] || 'ユーザー';

      // Prismaにユーザーが存在するか確認（IDまたはメールアドレス）
      const existingUserById = await prisma.user.findUnique({
        where: { id: user.id },
      });

      const existingUserByEmail = await prisma.user.findFirst({
        where: { email: user.email! },
      });

      if (existingUserById || existingUserByEmail) {
        console.log(`⏭️  ${user.email} は既に存在します (ID: ${user.id.substring(0, 8)}...)`);
        
        // IDは違うがメールアドレスが同じ場合は警告
        if (existingUserByEmail && existingUserByEmail.id !== user.id) {
          console.log(`⚠️  警告: メールアドレスは存在しますが、IDが異なります`);
          console.log(`   Supabase Auth ID: ${user.id}`);
          console.log(`   Prisma User ID: ${existingUserByEmail.id}`);
        }
        continue;
      }

      // Prismaにユーザーを作成
      try {
        await prisma.user.create({
          data: {
            id: user.id,
            email: user.email!,
            name,
            role: (role.toUpperCase() as UserRole),
          },
        });

        console.log(`✅ ${user.email} を同期しました (${role})`);
      } catch (createError: any) {
        console.error(`❌ ${user.email} の同期に失敗:`, createError.message);
      }
    }

    console.log('\n🎉 同期完了！');
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncUsers();

