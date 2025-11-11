'use client';

import { motion } from 'framer-motion';
import { FaUserPlus, FaSearch, FaRocket } from 'react-icons/fa';

export default function HowItWorksSection() {
  const steps = [
    {
      icon: <FaUserPlus className="text-5xl text-purple-600" />,
      step: 'STEP 1',
      title: 'アカウント作成',
      description: 'メールアドレスで簡単登録',
    },
    {
      icon: <FaSearch className="text-5xl text-pink-600" />,
      step: 'STEP 2',
      title: 'プロフィール設定',
      description: '学びたいこと、教えられることを登録',
    },
    {
      icon: <FaRocket className="text-5xl text-orange-600" />,
      step: 'STEP 3',
      title: 'マッチング開始',
      description: '興味のある相手を見つけて連絡',
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            簡単3ステップで始められます
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="text-center relative"
            >
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-purple-300 to-pink-300 -z-10" />
              )}
              <div className="flex justify-center mb-6">{step.icon}</div>
              <div className="text-sm font-bold text-purple-600 mb-2">
                {step.step}
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">
                {step.title}
              </h3>
              <p className="text-gray-600">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
