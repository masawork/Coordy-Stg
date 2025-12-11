'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import type { User } from '@/lib/auth/types';

export default function HeroSection() {
  const [session, setSession] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const currentSession = getSession();
    setSession(currentSession);
  }, []);

  // ユーザーボタンの遷移先を決定
  const getUserButtonHref = () => {
    if (!mounted || !session) return '/signup/user';
    if (session.role === 'user') return '/user';
    return '/signup/user';
  };

  // サービス出品者ボタンの遷移先を決定
  const getInstructorButtonHref = () => {
    if (!mounted || !session) return '/signup/instructor';
    if (session.role === 'instructor') return '/instructor';
    // ユーザーとしてログイン中でも /signup/instructor へ（別ロールのアカウント作成を許可）
    return '/signup/instructor';
  };

  // ボタンテキストを決定（ログイン状態でもラベルは変えない）
  const getUserButtonText = () => {
    return 'ユーザーの新規登録はこちら';
  };

  const getInstructorButtonText = () => {
    return 'サービス出品者の新規登録はこちら';
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white overflow-hidden pt-14">
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
        <div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            予約から受講まで、<br />
            すべてをシンプルに
          </h1>
        </div>

        <div>
          <p className="text-xl md:text-2xl mb-12 text-white/90 max-w-3xl mx-auto">
            レッスン・セッション予約のための新しいプラットフォーム
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 justify-center mb-20">
          <Link href={getUserButtonHref()} className="text-center">
            <button className="text-lg px-10 py-4 font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white w-full sm:w-auto">
              {getUserButtonText()}
            </button>
          </Link>
          <Link href={getInstructorButtonHref()} className="text-center">
            <button className="text-lg px-10 py-4 font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white w-full sm:w-auto">
              {getInstructorButtonText()}
            </button>
          </Link>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center items-start pt-2">
            <div className="w-1 h-3 bg-white/80 rounded-full"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
