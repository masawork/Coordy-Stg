/**
 * お知らせのテストデータを作成するスクリプト
 * 
 * 実行方法:
 * npx tsx scripts/seed-announcements.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 お知らせのテストデータを作成中...');

  // 管理者ユーザーを取得（存在する最初のADMINユーザー）
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!adminUser) {
    console.error('❌ 管理者ユーザーが見つかりません。先にユーザーを作成してください。');
    return;
  }

  console.log(`✅ 管理者ユーザー: ${adminUser.name} (${adminUser.email})`);

  // テストお知らせデータ
  const announcements = [
    {
      authorId: adminUser.id,
      target: 'all',
      priority: 'high',
      title: 'システムメンテナンスのお知らせ',
      content: '誠に勝手ながら、下記の日程でシステムメンテナンスを実施いたします。\n\n【メンテナンス日時】\n2024年1月15日（月）午前2:00〜午前4:00\n\n【影響範囲】\nメンテナンス中は全サービスがご利用いただけません。\n\nご不便をおかけいたしますが、何卒ご理解とご協力のほどよろしくお願い申し上げます。',
      isPublished: true,
      publishedAt: new Date(),
      expiresAt: null,
    },
    {
      authorId: adminUser.id,
      target: 'users',
      priority: 'medium',
      title: '新規講師が加わりました！',
      content: 'この度、経験豊富なヨガインストラクター3名が新たに加わりました。\n\n【新規講師】\n・田中先生（ハタヨガ専門）\n・佐藤先生（パワーヨガ専門）\n・鈴木先生（リストラティブヨガ専門）\n\nぜひレッスンをご予約ください！',
      isPublished: true,
      publishedAt: new Date(),
      expiresAt: null,
    },
    {
      authorId: adminUser.id,
      target: 'instructors',
      priority: 'medium',
      title: '講師向け勉強会のお知らせ',
      content: '講師の皆様を対象とした勉強会を開催いたします。\n\n【日時】2024年2月10日（土）14:00〜16:00\n【場所】オンライン（Zoom）\n【内容】効果的なオンラインレッスンの進め方\n\n参加希望の方は運営までご連絡ください。',
      isPublished: true,
      publishedAt: new Date(),
      expiresAt: new Date('2024-02-09'),
    },
    {
      authorId: adminUser.id,
      target: 'all',
      priority: 'low',
      title: 'アプリの新機能のご案内',
      content: 'この度、以下の新機能を追加いたしました。\n\n✨ 新機能\n• お気に入り講師の登録\n• レッスン履歴の確認\n• ポイントチャージ機能\n\nより便利にご利用いただけるようになりました。ぜひお試しください！',
      isPublished: true,
      publishedAt: new Date(),
      expiresAt: null,
    },
    {
      authorId: adminUser.id,
      target: 'users',
      priority: 'high',
      title: '【重要】利用規約の改定について',
      content: '利用規約を改定いたしました。\n\n【改定日】2024年1月20日\n【主な変更点】\n• キャンセルポリシーの明確化\n• ポイント有効期限の延長（6ヶ月→12ヶ月）\n• 返金規定の追加\n\n詳細は利用規約ページをご確認ください。',
      isPublished: true,
      publishedAt: new Date(),
      expiresAt: null,
    },
  ];

  // お知らせを作成
  for (const announcement of announcements) {
    const created = await prisma.adminAnnouncement.create({
      data: announcement,
    });
    console.log(`✅ 作成: ${created.title}`);
  }

  console.log('');
  console.log('🎉 テストデータの作成が完了しました！');
  console.log('');
  console.log('📍 以下のページで確認できます:');
  console.log('   - ユーザー: http://localhost:3000/user');
  console.log('   - お知らせ一覧: http://localhost:3000/user/announcements');
  console.log('   - 管理画面: http://localhost:3000/manage/admin/announcements');
  console.log('   - 講師画面: http://localhost:3000/instructor/announcements');
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

