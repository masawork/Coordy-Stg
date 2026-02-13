'use client';

import { motion } from 'framer-motion';
import { FaHeartbeat, FaGlobeAmericas, FaLaptopCode, FaPalette, FaChartLine, FaGraduationCap } from 'react-icons/fa';

export default function Categories() {
  const categories = [
    {
      icon: <FaHeartbeat className="text-4xl text-green-600" />,
      title: 'ヨガ・フィットネス',
      items: [
        'ハタヨガ・パワーヨガ',
        'ピラティス・ストレッチ',
        '瞑想・マインドフルネス',
      ],
      featured: true, // 最優先カテゴリー
    },
    {
      icon: <FaGlobeAmericas className="text-4xl text-blue-600" />,
      title: '語学・コミュニケーション',
      items: [
        '英会話・ビジネス英語',
        'その他外国語',
        'コミュニケーションスキル',
      ],
    },
    {
      icon: <FaLaptopCode className="text-4xl text-pink-600" />,
      title: 'IT・テクノロジー',
      items: [
        'プログラミング・Web制作',
        'デザイン・動画編集',
        'AI活用・データ分析',
      ],
    },
    {
      icon: <FaPalette className="text-4xl text-orange-600" />,
      title: 'クリエイティブ',
      items: [
        'イラスト・デザイン',
        '音楽・楽器演奏',
        '写真・動画制作',
      ],
    },
    {
      icon: <FaChartLine className="text-4xl text-purple-600" />,
      title: 'ビジネススキル',
      items: [
        'マーケティング・営業術',
        'プレゼンテーション',
        '起業・副業ノウハウ',
      ],
    },
    {
      icon: <FaGraduationCap className="text-4xl text-indigo-600" />,
      title: '学習・資格',
      items: [
        '受験対策・資格取得',
        '学習方法・勉強術',
      ],
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
          <div className="inline-block bg-green-600 text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
            🧘‍♀️ オンラインヨガから始めよう
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            様々な分野のレッスンに対応
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            ヨガ・フィットネスをメインに、語学、IT、ビジネスまで幅広くカバー
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {categories.map((category, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`relative p-8 rounded-xl hover:shadow-lg transition-all duration-300 ${
                category.featured
                  ? 'bg-gradient-to-br from-green-100 to-emerald-100 ring-2 ring-green-500 shadow-md'
                  : 'bg-gray-50'
              }`}
            >
              {/* 人気バッジ */}
              {category.featured && (
                <div className="absolute top-4 right-4">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-600 text-white shadow-md">
                    🔥 人気
                  </span>
                </div>
              )}
              
              <div className="flex justify-center mb-4">{category.icon}</div>
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                {category.title}
              </h3>
              <ul className="space-y-2">
                {category.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="text-gray-600 text-center">
                    ・{item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
