'use client';

import { motion } from 'framer-motion';
import { FaShieldAlt, FaClock, FaStar, FaCheckCircle } from 'react-icons/fa';

export default function VerificationBenefitsSection() {
  const benefits = [
    {
      icon: <FaClock className="text-4xl text-purple-600" />,
      level: 'Level 1: 基本認証',
      title: '電話番号確認で始める',
      features: [
        '予約・決済が可能に',
        '24時間前まで無料キャンセル',
        '最大5,000円の決済',
      ],
      badge: '簡単3分',
    },
    {
      icon: <FaStar className="text-4xl text-orange-600" />,
      level: 'Level 2: 本人確認完了',
      title: 'さらに便利に、安心して',
      features: [
        '1時間前まで柔軟なキャンセル',
        '高額決済対応（50,000円/回）',
        '優先サポート・特典',
      ],
      badge: 'おすすめ',
      highlight: true,
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-4">
            <FaShieldAlt className="text-purple-600" />
            <span className="text-sm font-medium text-gray-700">安心・安全</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            本人確認で、もっと便利に
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            認証レベルに応じて、より柔軟なキャンセルポリシーや高額決済が可能に。
            <br />
            安心してサービスをご利用いただけます。
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className={`relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow ${
                benefit.highlight ? 'ring-2 ring-purple-500' : ''
              }`}
            >
              {/* バッジ */}
              {benefit.badge && (
                <div className="absolute top-4 right-4">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      benefit.highlight
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {benefit.badge}
                  </span>
                </div>
              )}

              {/* アイコン */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-shrink-0">{benefit.icon}</div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">{benefit.level}</p>
                  <h3 className="text-xl font-bold text-gray-800">{benefit.title}</h3>
                </div>
              </div>

              {/* 特典リスト */}
              <ul className="space-y-3">
                {benefit.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <FaCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* キャンセルポリシー詳細 */}
              {index === 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500">キャンセルポリシー:</p>
                  <p className="text-sm text-gray-600 mt-1">
                    24時間前まで無料、24時間〜1時間前は50%、1時間以内は返金不可
                  </p>
                </div>
              )}

              {index === 1 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500">キャンセルポリシー:</p>
                  <p className="text-sm text-gray-600 mt-1">
                    24時間前まで無料、3時間前まで30%、<span className="font-bold text-purple-600">1時間前まで50%</span>、1時間以内は返金不可
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-12"
        >
          <p className="text-gray-600 mb-4">
            まずはメールアドレスで登録して、サービスを体験してみましょう
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="/signup/user"
              className="inline-block px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-full hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
            >
              無料で始める
            </a>
            <a
              href="#how-it-works"
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              詳しい流れを見る →
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

