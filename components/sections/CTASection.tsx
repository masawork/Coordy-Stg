'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Button from '../common/Button';
import { getSession } from '@/lib/auth/session';
import type { User } from '@/lib/auth/types';

export default function CTASection() {
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
    <section className="py-20 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white">
      <div className="container mx-auto px-4 md:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            今すぐ始めよう
          </h2>
          <p className="text-xl mb-10 text-white/90">
            受講する側も、提供する側も、あなたの第一歩をサポートします
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link href={getUserButtonHref()} className="text-center">
              <Button variant="secondary" size="lg" className="text-lg">
                {getUserButtonText()}
              </Button>
            </Link>
            <Link href={getInstructorButtonHref()} className="text-center">
              <Button variant="secondary" size="lg" className="text-lg">
                {getInstructorButtonText()}
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
