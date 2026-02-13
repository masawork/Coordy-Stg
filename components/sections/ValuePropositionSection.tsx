'use client';

import { motion } from 'framer-motion';
import { FaShieldAlt, FaClock, FaSearchLocation } from 'react-icons/fa';

export default function ValuePropositionSection() {
  const values = [
    {
      icon: <FaShieldAlt className="text-5xl text-purple-600" />,
      title: '安心の本人確認システム',
      description: '電話番号確認から本人確認まで、段階的な認証システムで安全性を確保',
      stats: 'Level 2 認証率 85%',
    },
    {
      icon: <FaClock className="text-5xl text-pink-600" />,
      title: '柔軟なキャンセルポリシー',
      description: '本人確認完了で1時間前まで柔軟にキャンセル可能。予定変更も安心',
      stats: '平均キャンセル率 < 5%',
    },
    {
      icon: <FaSearchLocation className="text-5xl text-orange-600" />,
      title: '精度の高いマッチング',
      description: 'あなたの目的・レベルに合わせた最適なインストラクターを提案',
      stats: 'マッチ満足度 98%',
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
            Coordyを選ぶ、3つの理由
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            他のプラットフォームにはない、Coordyならではの価値をご提供
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {values.map((value, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="relative bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100"
            >
              {/* アイコン */}
              <div className="flex justify-center mb-6">{value.icon}</div>
              
              {/* タイトル */}
              <h3 className="text-xl font-bold text-gray-800 mb-3 text-center">
                {value.title}
              </h3>
              
              {/* 説明 */}
              <p className="text-gray-600 text-center mb-4 leading-relaxed">
                {value.description}
              </p>
              
              {/* 統計 */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm font-semibold text-purple-600 text-center">
                  {value.stats}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

