'use client';

import { motion } from 'framer-motion';
import { FaStar, FaBolt, FaCoins, FaChartLine, FaUsers, FaTools } from 'react-icons/fa';

export default function InstructorBenefits() {
  const benefits = [
    {
      icon: <FaStar className="text-4xl text-purple-600" />,
      title: '知識と経験を活かす',
      description: 'あなたの専門スキルや経験を\n必要としている人に届けられます',
    },
    {
      icon: <FaBolt className="text-4xl text-pink-600" />,
      title: '自由な働き方',
      description: '好きな時間に、好きな場所で\n自分のペースで活動できます',
    },
    {
      icon: <FaCoins className="text-4xl text-orange-600" />,
      title: '新しい収入源',
      description: '趣味や特技を活かして\n副収入を得ることができます',
    },
    {
      icon: <FaChartLine className="text-4xl text-blue-600" />,
      title: '自己成長の機会',
      description: '教えることで自分の知識も整理され\n新たな気づきを得られます',
    },
    {
      icon: <FaUsers className="text-4xl text-green-600" />,
      title: '人との繋がり',
      description: '生徒との出会いを通じて\nやりがいと充実感を',
    },
    {
      icon: <FaTools className="text-4xl text-indigo-600" />,
      title: 'サポート体制',
      description: 'スケジュール管理や決済など\n面倒な作業はシステムがサポート',
    },
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            🌟 スキルを活かして教える側へ
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
              className="bg-white p-8 rounded-xl hover:shadow-lg transition-shadow duration-300"
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
