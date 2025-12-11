'use client';

import { motion } from 'framer-motion';
import { FaBookmark, FaLightbulb, FaClock, FaHandshake, FaMapMarkerAlt } from 'react-icons/fa';

export default function UserBenefits() {
  const benefits = [
    {
      icon: <FaBookmark className="text-4xl text-purple-600" />,
      title: 'あなただけの学習体験',
      description: '興味のある分野を、自分のペースでマンツーマンで学べます',
    },
    {
      icon: <FaLightbulb className="text-4xl text-pink-600" />,
      title: '多様な選択肢',
      description: '様々な分野のサービス出品者から、あなたに合った人を選べます',
    },
    {
      icon: <FaClock className="text-4xl text-orange-600" />,
      title: '柔軟なスケジュール',
      description: '仕事や学校の合間に、都合の良い時間で受講可能',
    },
    {
      icon: <FaHandshake className="text-4xl text-blue-600" />,
      title: '直接つながる安心感',
      description: 'サービス出品者と直接やり取り。質問や相談もしやすい環境',
    },
    {
      icon: <FaMapMarkerAlt className="text-4xl text-green-600" />,
      title: 'オンライン・対面を自由に選択',
      description: 'オンラインレッスンで全国どこからでも、対面レッスンで直接指導も。あなたの希望や内容に合わせて選べます',
    },
    {
      icon: <FaBookmark className="text-4xl text-indigo-600" />,
      title: 'オーダーメイドの学習プラン',
      description: '事前のヒアリングで目標を明確化。あなた専用のカリキュラムで効率的に成長',
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
            📚 ユーザーへのメリット
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-gray-50 p-8 rounded-xl hover:shadow-lg transition-shadow duration-300"
            >
              <div className="flex justify-center mb-4">{benefit.icon}</div>
              <h3 className="text-xl font-bold text-gray-800 mb-3 text-center">
                {benefit.title}
              </h3>
              <p className="text-gray-600 text-center whitespace-pre-line">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
