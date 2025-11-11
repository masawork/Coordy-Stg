'use client';

import { motion } from 'framer-motion';
import { FaChartLine, FaLaptopCode, FaGlobeAmericas, FaPalette, FaHeartbeat, FaGraduationCap } from 'react-icons/fa';

export default function Categories() {
  const categories = [
    {
      icon: <FaChartLine className="text-4xl text-purple-600" />,
      title: 'ビジネススキル',
      items: [
        'マーケティング・営業術',
        'プレゼンテーション・資料作成',
        '起業・副業ノウハウ',
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
      icon: <FaGlobeAmericas className="text-4xl text-blue-600" />,
      title: '語学・コミュニケーション',
      items: [
        '英会話・ビジネス英語',
        'その他外国語',
        'コミュニケーションスキル',
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
      icon: <FaHeartbeat className="text-4xl text-green-600" />,
      title: '健康・ライフスタイル',
      items: [
        'フィットネス・ヨガ',
        '料理・栄養管理',
        'メンタルケア',
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
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            こんな分野で活動できます
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {categories.map((category, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-gray-50 p-8 rounded-xl hover:shadow-lg transition-shadow duration-300"
            >
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
