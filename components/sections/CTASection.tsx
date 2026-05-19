'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Button from '../common/Button';
import { getSession } from '@/lib/auth';

export default function CTASection() {
  const [session, setSession] = useState<any | null>(null);
  const mountedRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    queueMicrotask(() => setMounted(true));
    const checkSession = async () => {
      const currentSession = await getSession();
      if (mountedRef.current) {
        setSession(currentSession?.user || null);
      }
    };
    checkSession();
  }, []);

  const getSignupHref = () => {
    if (!mounted || !session) return '/signup';
    return '/user';
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
            <Link href={getSignupHref()} className="text-center">
              <Button variant="secondary" size="lg" className="text-lg">
                無料で新規登録
              </Button>
            </Link>
            <Link href="/login" className="text-center">
              <Button variant="secondary" size="lg" className="text-lg border-white/50">
                ログインはこちら
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
