'use client';

import { motion } from 'framer-motion';

export default function Message() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8">
            Coordyが目指すもの
          </h2>

          <div className="space-y-6 text-lg md:text-xl text-gray-700 leading-relaxed">
            <p className="font-semibold text-2xl text-gray-800">
              「学ぶ」と「教える」で、人生はもっと豊かになる
            </p>

            <p>
              誰もが持っている知識や経験には、誰かにとっての価値があります。
            </p>

            <p>
              その価値を必要としている人に届けることで、教える側も学ぶ側も成長できる。
            </p>

            <p>
              Coordyは、そんな学び合いの場を提供し、<br />
              一人ひとりが自分らしく成長できる社会の実現を目指しています。
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
