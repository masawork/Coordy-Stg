'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { FaUser, FaChalkboardTeacher, FaTimes } from 'react-icons/fa';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes size={24} />
              </button>

              {/* Title */}
              <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
                ログイン方法を選択
              </h2>

              {/* Login options */}
              <div className="space-y-4">
                <Link href="/login/user" onClick={onClose}>
                  <div className="group cursor-pointer w-full max-w-sm mx-auto h-32 flex items-center justify-between border-2 border-gray-200 rounded-xl px-6 hover:border-blue-600 hover:bg-blue-50 transition-all duration-300 ease-in-out">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 group-hover:bg-blue-200 p-3 rounded-full transition-colors duration-300">
                        <FaUser className="text-blue-600 text-2xl" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">
                          ユーザーとしてログイン
                        </h3>
                        <p className="text-sm text-gray-600">
                          スキルアップを始める
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/login/instructor" onClick={onClose}>
                  <div className="group cursor-pointer w-full max-w-sm mx-auto h-32 flex items-center justify-between border-2 border-gray-200 rounded-xl px-6 hover:border-green-600 hover:bg-green-50 transition-all duration-300 ease-in-out">
                    <div className="flex items-center gap-4">
                      <div className="bg-green-100 group-hover:bg-green-200 p-3 rounded-full transition-colors duration-300">
                        <FaChalkboardTeacher className="text-green-600 text-2xl" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">
                          インストラクターとしてログイン
                        </h3>
                        <p className="text-sm text-gray-600">
                          スキルをシェアして活躍する
                        </p>
                      </div>
                    </div>
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
