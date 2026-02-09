'use client';

import { motion } from 'framer-motion';

export default function UseCasesSection() {
  const useCases = [
    {
      emoji: '🧘‍♀️',
      title: '自宅でヨガを始めたい',
      description: 'スタジオに通う時間がない方に。早朝や夜、好きな時間にオンラインで受講できます。',
      tag: '初心者歓迎',
      tagColor: 'bg-green-100 text-green-700',
    },
    {
      emoji: '💼',
      title: '仕事の合間にリフレッシュ',
      description: '在宅勤務の休憩時間に。15分の短時間レッスンから、気軽に始められます。',
      tag: '短時間OK',
      tagColor: 'bg-blue-100 text-blue-700',
    },
    {
      emoji: '👨‍👩‍👧',
      title: '家族みんなで楽しむ',
      description: '親子ヨガ、シニアヨガなど、年齢・レベルに合わせて選べる多彩なレッスン。',
      tag: '全年齢対応',
      tagColor: 'bg-purple-100 text-purple-700',
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-block bg-green-600 text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
            🧘‍♀️ あなたのライフスタイルに合わせて
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            こんな方におすすめ
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            自宅で、好きな時間に。柔軟なレッスンスタイルで、あなたの生活に寄り添います。
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {useCases.map((useCase, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-green-100"
            >
              <div className="text-6xl mb-4 text-center">{useCase.emoji}</div>
              <div className="text-center mb-4">
                <span className={`inline-block px-3 py-1 ${useCase.tagColor} rounded-full text-xs font-bold`}>
                  {useCase.tag}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3 text-center">
                {useCase.title}
              </h3>
              <p className="text-gray-600 text-center leading-relaxed">
                {useCase.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* 追加の説明 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-12"
        >
          <p className="text-gray-600 text-sm">
            ヨガだけでなく、語学、IT、ビジネススキルなど、様々な分野のレッスンをご用意しています
          </p>
        </motion.div>
      </div>
    </section>
  );
}

