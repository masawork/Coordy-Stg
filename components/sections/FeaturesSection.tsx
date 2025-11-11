'use client';

import { motion } from 'framer-motion';
import { FaSearch, FaShieldAlt, FaHandshake } from 'react-icons/fa';

export default function FeaturesSection() {
  const features = [
    {
      icon: <FaSearch className="text-5xl text-purple-600" />,
      title: 'シンプルで使いやすい',
      description: '複雑な機能は省き\n必要な機能だけを分かりやすく',
    },
    {
      icon: <FaShieldAlt className="text-5xl text-pink-600" />,
      title: '安心・安全な環境',
      description: '本人確認システム\nセキュアな決済システム\nトラブル時のサポート',
    },
    {
      icon: <FaHandshake className="text-5xl text-orange-600" />,
      title: 'フェアな仕組み',
      description: '適正な手数料\n透明性のある評価システム\n双方にとって公平な環境',
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
            Coordyの3つの約束
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="flex justify-center mb-6">{feature.icon}</div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
