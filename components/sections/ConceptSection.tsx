'use client';

import { motion } from 'framer-motion';

export default function ConceptSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8">
            Coordyとは
          </h2>

          <div className="space-y-6 text-lg md:text-xl text-gray-700 leading-relaxed">
            <p>
              時間を有効活用したい人と<br />
              専門知識を共有したい人が出会える場所。
            </p>

            <p>
              あなたの「学びたい」と<br />
              誰かの「教えたい」をマッチング。
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
