'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Button from '../common/Button';

export default function CTASection() {
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
            学ぶ側も、教える側も、あなたの第一歩をサポートします
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup/user">
              <Button variant="secondary" size="lg" className="text-lg">
                ユーザー登録
              </Button>
            </Link>
            <Link href="/signup/instructor">
              <Button variant="secondary" size="lg" className="text-lg">
                インストラクター登録
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
