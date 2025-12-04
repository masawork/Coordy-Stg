/**
 * サンプルデータ投入スクリプト
 *
 * 実行方法:
 * npx tsx scripts/seed-services.ts
 *
 * 注意:
 * - Amplify環境が正しく設定されている必要があります
 * - 認証トークンが必要な場合は、APIキーモードで実行してください
 */

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';

// Amplify設定（環境変数またはconfig.jsonから読み込み）
// 注意: 本番環境では環境変数を使用してください
Amplify.configure({
  API: {
    GraphQL: {
      endpoint: process.env.NEXT_PUBLIC_AMPLIFY_GRAPHQL_ENDPOINT || '',
      region: process.env.NEXT_PUBLIC_AMPLIFY_REGION || 'ap-northeast-1',
      defaultAuthMode: 'apiKey',
      apiKey: process.env.NEXT_PUBLIC_AMPLIFY_API_KEY || '',
    },
  },
});

const client = generateClient<Schema>();

/**
 * サンプルインストラクターデータ
 */
const sampleInstructors = [
  {
    userId: 'instructor-a-001',
    displayName: '山田ヨガ',
    bio: '10年以上のヨガ指導経験を持つインストラクター。初心者から上級者まで幅広く対応します。心と体の調和を大切にしたレッスンを提供しています。',
    specialties: ['ヨガ', 'ストレッチ', 'リラクゼーション'],
    profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    hourlyRate: 5000,
    rating: 4.8,
    reviewCount: 156,
    status: 'active',
  },
  {
    userId: 'instructor-b-001',
    displayName: '佐藤トレーナー',
    bio: 'プロフェッショナルパーソナルトレーナー。筋トレ・ダイエット指導のスペシャリスト。あなたの目標達成をサポートします。',
    specialties: ['筋トレ', 'ダイエット', 'パーソナルトレーニング'],
    profileImage: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400',
    hourlyRate: 8000,
    rating: 4.9,
    reviewCount: 203,
    status: 'active',
  },
  {
    userId: 'instructor-c-001',
    displayName: '鈴木ピラティス',
    bio: 'ピラティス認定インストラクター。体幹強化とボディメイクが得意です。優しく丁寧な指導で安心してレッスンを受けられます。',
    specialties: ['ピラティス', 'ストレッチ', '姿勢改善'],
    profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    hourlyRate: 6000,
    rating: 4.7,
    reviewCount: 89,
    status: 'active',
  },
];

/**
 * サンプルサービスデータ
 */
const sampleServices = [
  // 山田ヨガのサービス
  {
    title: '朝ヨガで心と体をリフレッシュ',
    description: '朝の清々しい時間に、心と体を目覚めさせる60分のヨガレッスン。初心者の方でも安心して参加できます。呼吸法とポーズを組み合わせて、1日を気持ちよくスタートしましょう。',
    category: 'yoga',
    duration: 60,
    basePrice: 3000,
    maxParticipants: 1,
    image: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800',
    tags: ['初心者歓迎', '朝活', 'リラックス'],
    status: 'published',
    instructorIndex: 0,
  },
  {
    title: 'パワーヨガで体幹強化',
    description: '運動量の多いパワーヨガで体幹を鍛え、筋力アップとシェイプアップを目指します。90分の集中レッスンで、汗をかきながら心身をデトックス。',
    category: 'yoga',
    duration: 90,
    basePrice: 4500,
    maxParticipants: 1,
    image: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=800',
    tags: ['中級者向け', '体幹強化', 'ダイエット'],
    status: 'published',
    instructorIndex: 0,
  },
  {
    title: 'リストラティブヨガで深いリラックス',
    description: 'ストレスや疲労を感じている方におすすめ。プロップスを使ったリストラティブヨガで、深いリラクゼーションを体験。60分で心身の緊張をほぐします。',
    category: 'yoga',
    duration: 60,
    basePrice: 3500,
    maxParticipants: 1,
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
    tags: ['初心者歓迎', 'リラックス', 'ストレス解消'],
    status: 'published',
    instructorIndex: 0,
  },

  // 佐藤トレーナーのサービス
  {
    title: 'パーソナル筋トレ指導',
    description: 'あなたの目標に合わせたオーダーメイドの筋トレメニュー。フォームチェックから食事アドバイスまで、プロが徹底サポート。60分の集中トレーニング。',
    category: 'personalTraining',
    duration: 60,
    basePrice: 8000,
    maxParticipants: 1,
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    tags: ['マンツーマン', '筋トレ', '結果重視'],
    status: 'published',
    instructorIndex: 1,
  },
  {
    title: 'ダイエット集中プログラム',
    description: '体重減少を目指す方のための90分集中プログラム。有酸素運動と筋トレを組み合わせた効果的なメニューで、確実に結果を出します。食事指導付き。',
    category: 'personalTraining',
    duration: 90,
    basePrice: 10000,
    maxParticipants: 1,
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800',
    tags: ['ダイエット', '食事指導', '初心者歓迎'],
    status: 'published',
    instructorIndex: 1,
  },
  {
    title: '初心者向け筋トレ入門',
    description: '筋トレ初心者の方のための基礎レッスン。正しいフォームと安全なトレーニング方法を学びます。60分で基本をマスター。',
    category: 'personalTraining',
    duration: 60,
    basePrice: 6000,
    maxParticipants: 1,
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
    tags: ['初心者歓迎', '筋トレ基礎', '丁寧指導'],
    status: 'published',
    instructorIndex: 1,
  },

  // 鈴木ピラティスのサービス
  {
    title: 'ピラティス基礎レッスン',
    description: 'ピラティスの基本動作を丁寧に指導。体幹を意識しながら、正しい姿勢と動きを身につけます。60分の初心者向けレッスン。',
    category: 'pilates',
    duration: 60,
    basePrice: 4000,
    maxParticipants: 1,
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800',
    tags: ['初心者歓迎', 'ピラティス', '姿勢改善'],
    status: 'published',
    instructorIndex: 2,
  },
  {
    title: '体幹強化ピラティス',
    description: 'マットピラティスで体幹を徹底的に鍛えます。インナーマッスルを強化し、美しい姿勢とボディラインを手に入れる75分レッスン。',
    category: 'pilates',
    duration: 75,
    basePrice: 5000,
    maxParticipants: 1,
    image: 'https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=800',
    tags: ['体幹強化', 'ボディメイク', '中級者向け'],
    status: 'published',
    instructorIndex: 2,
  },
  {
    title: 'ストレッチ&ピラティス',
    description: 'ストレッチとピラティスを組み合わせた60分のレッスン。柔軟性向上と体幹強化を同時に実現。デスクワークの方にもおすすめ。',
    category: 'pilates',
    duration: 60,
    basePrice: 4500,
    maxParticipants: 1,
    image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800',
    tags: ['ストレッチ', '柔軟性向上', '初心者歓迎'],
    status: 'published',
    instructorIndex: 2,
  },
];

/**
 * データ投入処理
 */
async function seedData() {
  console.log('🌱 サンプルデータ投入を開始します...\n');

  try {
    // インストラクターデータ投入
    console.log('👤 インストラクターデータを投入中...');
    const createdInstructors = [];

    for (const instructor of sampleInstructors) {
      try {
        const { data, errors } = await client.models.Instructor.create(instructor);
        if (errors) {
          console.error(`❌ ${instructor.displayName}の作成エラー:`, errors);
        } else {
          console.log(`✅ ${instructor.displayName}を作成しました (ID: ${data?.id})`);
          createdInstructors.push(data);
        }
      } catch (error) {
        console.error(`❌ ${instructor.displayName}の作成エラー:`, error);
      }
    }

    console.log(`\n✅ ${createdInstructors.length}人のインストラクターを作成しました\n`);

    // サービスデータ投入
    console.log('🎯 サービスデータを投入中...');
    let serviceCount = 0;

    for (const service of sampleServices) {
      const { instructorIndex, ...serviceData } = service;
      const instructor = createdInstructors[instructorIndex];

      if (!instructor || !instructor.id) {
        console.warn(`⚠️ インストラクターが見つかりません (index: ${instructorIndex})`);
        continue;
      }

      try {
        const { data, errors } = await client.models.Service.create({
          ...serviceData,
          instructorId: instructor.id,
        });

        if (errors) {
          console.error(`❌ ${serviceData.title}の作成エラー:`, errors);
        } else {
          console.log(`✅ ${serviceData.title}を作成しました (ID: ${data?.id})`);
          serviceCount++;
        }
      } catch (error) {
        console.error(`❌ ${serviceData.title}の作成エラー:`, error);
      }
    }

    console.log(`\n✅ ${serviceCount}件のサービスを作成しました\n`);
    console.log('🎉 サンプルデータ投入が完了しました！');
    console.log('\n📊 投入結果:');
    console.log(`   - インストラクター: ${createdInstructors.length}人`);
    console.log(`   - サービス: ${serviceCount}件`);
  } catch (error) {
    console.error('❌ データ投入エラー:', error);
    throw error;
  }
}

// スクリプト実行
seedData()
  .then(() => {
    console.log('\n✨ 完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 エラーが発生しました:', error);
    process.exit(1);
  });
