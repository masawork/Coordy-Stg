'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';

interface HeroSectionProps {
  isInstructor: boolean;
  setIsInstructor: (value: boolean) => void;
}

export default function HeroSection({ isInstructor, setIsInstructor }: HeroSectionProps) {
  const [session, setSession] = useState<any | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkSession = async () => {
      const currentSession = await getSession();
      setSession(currentSession?.user || null);
    };
    checkSession();
  }, []);

  const getUserButtonHref = () => {
    if (!mounted || !session) {
      return isInstructor ? '/signup/instructor' : '/signup/user';
    }
    if (session.user_metadata?.role?.toLowerCase() === 'user') return '/user';
    if (session.user_metadata?.role?.toLowerCase() === 'instructor') return '/instructor';
    return isInstructor ? '/signup/instructor' : '/signup/user';
  };

  // 生徒モードと先生モードの背景グラデーション
  const bgGradient = isInstructor
    ? 'from-amber-400 via-orange-500 to-red-500' // ゴールド/オレンジ系でプロフェッショナル感
    : 'from-green-400 via-blue-500 to-purple-600';

  return (
    <section className={`relative min-h-screen flex items-center bg-gradient-to-br ${bgGradient} text-white overflow-hidden pt-20 transition-all duration-700`}>
      {/* 背景の幾何学模様 */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        ></div>
      </div>

      {/* メインコンテンツ - 2カラムレイアウト */}
      <div className="relative z-10 container mx-auto px-6 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-80px)]">
          
          {/* 左カラム: テキスト・CTA */}
          <div className="space-y-8">
            {/* トグルスイッチ - 視認性強化版 */}
            <div className="flex flex-col items-center sm:items-start gap-2">
              {/* 問いかけラベル */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-white font-bold text-sm drop-shadow-md flex items-center gap-2"
              >
                <span>今日はどうする？</span>
                <span className="animate-bounce">👇</span>
              </motion.div>
              
              {/* 操作パネル化したトグルスイッチ */}
              <div className="p-2 bg-white/10 backdrop-blur-md border border-white/30 rounded-full shadow-xl">
                <div className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-full p-1.5 gap-1">
                  <button
                    onClick={() => setIsInstructor(false)}
                    className={`relative flex-1 px-6 py-3.5 rounded-full font-bold text-base transition-all duration-300 whitespace-nowrap ${
                      !isInstructor
                        ? 'text-white'
                        : 'text-white/90 hover:text-white hover:scale-105'
                    }`}
                  >
                    {!isInstructor && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-white/30 backdrop-blur-md rounded-full shadow-lg"
                        transition={{ type: 'spring', duration: 0.5 }}
                      />
                    )}
                    <span className="relative z-10">🔍 レッスンを探す</span>
                  </button>
                  <button
                    onClick={() => setIsInstructor(true)}
                    className={`relative flex-1 px-6 py-3.5 rounded-full font-bold text-base transition-all duration-300 whitespace-nowrap ${
                      isInstructor
                        ? 'text-white'
                        : 'text-white/90 hover:text-white hover:scale-105'
                    }`}
                  >
                    {isInstructor && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-white/30 backdrop-blur-md rounded-full shadow-lg"
                        transition={{ type: 'spring', duration: 0.5 }}
                      />
                    )}
                    <span className="relative z-10">🧘‍♂️ インストラクターになる</span>
                  </button>
                </div>
              </div>
            </div>

            {/* コンテンツ切り替え */}
            <AnimatePresence mode="wait">
              {!isInstructor ? (
                // 🅰️ 生徒モード
                <motion.div
                  key="student"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-8"
                >
                  {/* メインコピー */}
                  <div className="space-y-2">
                    <p className="text-2xl md:text-3xl font-medium text-white/90">
                      自宅でヨガ、オンラインで学ぶ。
                    </p>
                    
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-yellow-300 leading-tight">
                      忙しいあなたも
                      <br />
                      続けやすい
                    </h1>
                  </div>

                  {/* サブメッセージ */}
                  <p className="text-lg md:text-xl text-white/80 max-w-xl">
                    1時間前までキャンセルOK。本人確認完了で、もっと自由に、もっと安心して。
                  </p>

                  {/* 実績カード */}
                  <div className="grid grid-cols-3 gap-4 max-w-xl">
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center hover:bg-white/30 transition-all duration-300 hover:scale-105">
                      <svg className="w-8 h-8 mx-auto mb-2 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <div className="text-2xl font-bold mb-1">5,000+</div>
                      <div className="text-xs text-white/80">レッスン</div>
                    </div>

                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center hover:bg-white/30 transition-all duration-300 hover:scale-105">
                      <svg className="w-8 h-8 mx-auto mb-2 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-2xl font-bold mb-1">98%</div>
                      <div className="text-xs text-white/80">満足度</div>
                    </div>

                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center hover:bg-white/30 transition-all duration-300 hover:scale-105">
                      <svg className="w-8 h-8 mx-auto mb-2 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-2xl font-bold mb-1">2時間</div>
                      <div className="text-xs text-white/80">返信速度</div>
                    </div>
                  </div>

                  {/* CTAボタン */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <Link href={getUserButtonHref()}>
                      <button className="group relative px-10 py-4 bg-white text-green-600 font-bold text-lg rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                        <span className="relative z-10">まずは無料で試してみる</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </button>
                    </Link>
                    <Link 
                      href="#how-it-works" 
                      className="flex items-center gap-2 text-white/90 hover:text-white font-medium transition-colors py-4"
                    >
                      <span>使い方を見る</span>
                      <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Link>
                  </div>
                </motion.div>
              ) : (
                // 🅱️ 先生モード
                <motion.div
                  key="instructor"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-8"
                >
                  {/* メインコピー */}
                  <div className="space-y-2">
                    <p className="text-2xl md:text-3xl font-medium text-white/90">
                      あなたのスキルが、誰かの力になる。
                    </p>
                    
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-yellow-300 leading-tight">
                      手数料10%
                      <br />
                      初期費用ゼロ
                    </h1>
                  </div>

                  {/* サブメッセージ */}
                  <p className="text-lg md:text-xl text-white/80 max-w-xl">
                    業界最安水準の手数料10%。今すぐ先生になって、あなたの知識を収益に変えましょう。
                  </p>

                  {/* 実績カード - インストラクター向け */}
                  <div className="grid grid-cols-3 gap-4 max-w-xl">
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center hover:bg-white/30 transition-all duration-300 hover:scale-105">
                      <svg className="w-8 h-8 mx-auto mb-2 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-2xl font-bold mb-1">10%</div>
                      <div className="text-xs text-white/80">手数料</div>
                    </div>

                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center hover:bg-white/30 transition-all duration-300 hover:scale-105">
                      <svg className="w-8 h-8 mx-auto mb-2 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <div className="text-2xl font-bold mb-1">3時間</div>
                      <div className="text-xs text-white/80">最短出品</div>
                    </div>

                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center hover:bg-white/30 transition-all duration-300 hover:scale-105">
                      <svg className="w-8 h-8 mx-auto mb-2 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-2xl font-bold mb-1">0円</div>
                      <div className="text-xs text-white/80">初期費用</div>
                    </div>
                  </div>

                  {/* CTAボタン */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <Link href={getUserButtonHref()}>
                      <button className="group relative px-10 py-4 bg-white text-amber-600 font-bold text-lg rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                        <span className="relative z-10">0円でインストラクター登録</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </button>
                    </Link>
                    <Link 
                      href="#instructor-benefits" 
                      className="flex items-center gap-2 text-white/90 hover:text-white font-medium transition-colors py-4"
                    >
                      <span>収益例を見る</span>
                      <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 右カラム: イラストエリア */}
          <div className="hidden lg:flex items-center justify-center">
            <AnimatePresence mode="wait">
              {!isInstructor ? (
                // 生徒用ビジュアル
                <motion.div
                  key="student-visual"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5 }}
                  className="relative w-full max-w-lg"
                >
                  <div className="relative">
                    <div className="absolute -top-10 -right-10 w-64 h-64 bg-green-300/30 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-blue-300/30 rounded-full blur-3xl"></div>
                    
                    <div className="relative bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl aspect-square flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="text-8xl">🧘‍♀️</div>
                        <p className="text-white text-lg font-medium">オンラインヨガ</p>
                        <p className="text-white/80 text-sm">自宅で、好きな時間に</p>
                      </div>
                    </div>

                    <div className="absolute -top-6 -left-6 bg-white/20 backdrop-blur-sm rounded-2xl p-4 animate-bounce">
                      <svg className="w-8 h-8 text-green-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                    <div className="absolute -bottom-4 -right-4 bg-white/20 backdrop-blur-sm rounded-2xl p-4 animate-pulse">
                      <svg className="w-8 h-8 text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              ) : (
                // 先生用ビジュアル
                <motion.div
                  key="instructor-visual"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5 }}
                  className="relative w-full max-w-lg"
                >
                  <div className="relative">
                    <div className="absolute -top-10 -right-10 w-64 h-64 bg-amber-300/30 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-orange-300/30 rounded-full blur-3xl"></div>
                    
                    <div className="relative bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl aspect-square flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="text-8xl">👨‍🏫</div>
                        <p className="text-white text-lg font-medium">オンライン講師</p>
                        <p className="text-white/80 text-sm">あなたのスキルが収益に</p>
                      </div>
                    </div>

                    <div className="absolute -top-6 -left-6 bg-white/20 backdrop-blur-sm rounded-2xl p-4 animate-bounce">
                      <svg className="w-8 h-8 text-amber-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
                      </svg>
                    </div>
                    <div className="absolute -bottom-4 -right-4 bg-white/20 backdrop-blur-sm rounded-2xl p-4 animate-pulse">
                      <svg className="w-8 h-8 text-orange-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* スクロールインジケーター */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center items-start pt-2">
          <div className="w-1 h-3 bg-white/80 rounded-full animate-pulse"></div>
        </div>
      </div>
    </section>
  );
}
