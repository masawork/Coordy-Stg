'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { FaUser, FaTimes } from 'react-icons/fa';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-[110]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex items-center justify-center z-[120] p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes size={24} />
              </button>

              <div className="text-center mb-6">
                <div className="bg-purple-100 p-3 rounded-full inline-flex mb-4">
                  <FaUser className="text-purple-600 text-2xl" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  ログイン
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  サービスの利用・出品ができます
                </p>
              </div>

              <div className="space-y-3">
                <Link href="/login" onClick={onClose}>
                  <div className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-full text-center hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl">
                    ログインする
                  </div>
                </Link>
                <Link href="/signup" onClick={onClose}>
                  <div className="w-full py-3 px-6 bg-white text-gray-700 font-bold rounded-full text-center border border-gray-300 hover:bg-gray-50 transition-all mt-3">
                    新規登録はこちら
                  </div>
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
