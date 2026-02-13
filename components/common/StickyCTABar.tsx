'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUser, FaChalkboardTeacher, FaTimes } from 'react-icons/fa';

export default function StickyCTABar() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // ヒーローセクションを通過したら表示
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      
      if (scrollPosition > windowHeight * 0.5 && !isDismissed) {
        setIsVisible(true);
      } else if (scrollPosition <= windowHeight * 0.5) {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-2xl border-t border-gray-200"
        >
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* CTAボタン */}
              <div className="flex flex-col sm:flex-row gap-3 flex-1 justify-center">
                <Link
                  href="/signup/user"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-full hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
                >
                  <FaUser className="text-sm" />
                  <span>ユーザー登録</span>
                </Link>
                <Link
                  href="/signup/instructor"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-full hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
                >
                  <FaChalkboardTeacher className="text-sm" />
                  <span>インストラクター登録</span>
                </Link>
              </div>

              {/* 閉じるボタン */}
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="閉じる"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

