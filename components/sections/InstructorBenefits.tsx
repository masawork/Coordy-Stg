'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { FaCoins, FaBolt, FaShieldAlt, FaCheckCircle } from 'react-icons/fa';

export default function InstructorBenefits() {
  const OUR_FEE = 10; // 自社の手数料率（%）
  
  const benefits = [
    {
      icon: <FaCoins className="text-5xl text-green-600" />,
      title: '高収益・低手数料',
      description: '業界最安水準の手数料10%。時給5,000円なら月20時間で9万円の収入',
      stats: '業界平均の半分の手数料',
      highlight: true,
    },
    {
      icon: <FaBolt className="text-5xl text-purple-600" />,
      title: '即日スタート可能',
      description: 'アカウント登録から最短3時間でサービス出品。すぐに活動開始できます',
      stats: '最短: 3時間',
    },
    {
      icon: <FaShieldAlt className="text-5xl text-pink-600" />,
      title: '安心の決済システム',
      description: 'エスクロー決済で未払いリスクゼロ。レッスン完了後、自動的に入金されます',
      stats: '未払い: 0件',
    },
  ];

  const features = [
    'スケジュール管理を自動化',
    'クレジットカード決済対応',
    '予約リマインド自動送信',
    'レビュー・評価システム',
    'チャット機能で事前相談',
    '集客サポート・SEO対策',
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-4">
            <FaCoins className="text-green-600" />
            <span className="text-sm font-medium text-gray-700">インストラクター向け</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            あなたのスキルを収益に変える
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            業界最安水準の手数料で、もっと稼げる。もっと自由に。
          </p>
        </motion.div>

        {/* 手数料比較セクション - 最推しポイント */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative bg-gradient-to-br from-white via-green-50 to-emerald-50 rounded-3xl p-8 md:p-12 shadow-2xl mb-12 max-w-5xl mx-auto overflow-hidden"
        >
          {/* 装飾背景 */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-300/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-300/20 rounded-full blur-3xl"></div>

          {/* 手書き風バッジ */}
          <div className="absolute -top-4 -right-4 md:top-4 md:right-8">
            <div className="relative">
              {/* バッジ本体 */}
              <div className="bg-yellow-400 text-gray-800 font-black text-sm md:text-base px-6 py-3 rounded-full shadow-lg transform rotate-12 border-4 border-yellow-500">
                業界最安水準
              </div>
              {/* 吹き出し風の装飾 */}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-yellow-500"></div>
              </div>
            </div>
          </div>

          <div className="relative z-10">
            {/* セクションタイトル */}
            <div className="text-center mb-8">
              <div className="inline-block bg-green-600 text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
                💰 Challenge Price
              </div>
              <h3 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-2">
                手数料 <span className="text-5xl md:text-6xl text-green-600">{OUR_FEE}%</span>
              </h3>
              <p className="text-gray-600">
                長く続けるほど、この差が大きな収益の違いに
              </p>
            </div>

            {/* あなたの手取り額を最大化 */}
            <div className="space-y-6 mb-8">
              {/* 視覚的な手数料表示 */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-green-200">
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-600 mb-4">
                    初期費用・月額費用 <span className="text-gray-800 font-bold">0円</span>
                  </p>
                  <div className="relative">
                    <div className="text-6xl md:text-7xl font-black text-green-600 mb-2">
                      {OUR_FEE}%
                    </div>
                    <div className="absolute -top-2 -right-2 md:top-0 md:right-4">
                      <span className="text-4xl md:text-5xl animate-pulse">✨</span>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-gray-800">
                    業界最安水準の手数料
                  </p>
                </div>

                {/* 手取りバー */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">あなたの手取り</span>
                    <span className="font-bold text-green-600">{100 - OUR_FEE}%</span>
                  </div>
                  <div className="relative h-14 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${100 - OUR_FEE}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, delay: 0.3 }}
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-400 via-green-500 to-emerald-600 flex items-center justify-center"
                    >
                      <span className="text-white font-bold text-lg">
                        売上の{100 - OUR_FEE}%があなたの収入に！
                      </span>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>

            {/* 具体的な収益例 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-green-200">
              <div className="text-center mb-4">
                <p className="text-lg font-bold text-gray-800 mb-2">具体的な収益例</p>
                <p className="text-sm text-gray-600">時給5,000円 × 月20時間の場合</p>
              </div>
              
              <div className="space-y-4">
                {/* 月間収益 */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                  <span className="text-gray-700 font-medium">月間売上</span>
                  <span className="text-2xl font-bold text-gray-800">100,000円</span>
                </div>
                
                {/* 手数料 */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <span className="text-gray-700 font-medium">手数料（{OUR_FEE}%）</span>
                  <span className="text-xl font-semibold text-gray-600">-{100000 * OUR_FEE / 100}円</span>
                </div>
                
                {/* 手取り */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg">
                  <span className="text-white font-bold text-lg">あなたの手取り</span>
                  <span className="text-3xl font-black text-white">{100000 * (100 - OUR_FEE) / 100}円</span>
                </div>
                
                {/* 年間収益 */}
                <div className="text-center pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">年間で</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(100000 * (100 - OUR_FEE) / 100 * 12).toLocaleString()}円
                  </p>
                  <p className="text-xs text-gray-500 mt-1">の収入を実現できます</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* その他のメリット */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
          {benefits.slice(1).map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {/* アイコン */}
              <div className="flex justify-center mb-6">{benefit.icon}</div>
              
              {/* タイトル */}
              <h3 className="text-xl font-bold text-gray-800 mb-3 text-center">
                {benefit.title}
              </h3>
              
              {/* 説明 */}
              <p className="text-gray-600 text-center mb-4 leading-relaxed">
                {benefit.description}
              </p>
              
              {/* 統計 */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm font-semibold text-green-600 text-center">
                  {benefit.stats}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 追加機能 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-white rounded-2xl p-8 shadow-lg max-w-4xl mx-auto mb-12"
        >
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            充実のサポート機能
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <FaCheckCircle className="text-green-500 flex-shrink-0" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <p className="text-gray-600 mb-6">
            初期費用・月額費用は一切なし。売上が発生した時だけ手数料{OUR_FEE}%
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signup/instructor"
              className="inline-block px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-full hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
            >
              インストラクターとして始める
            </Link>
            <p className="text-sm text-gray-500">
              登録後、最短3時間で出品可能 →
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
