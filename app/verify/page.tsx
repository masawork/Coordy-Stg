"use client";
import { useState } from "react";
import { confirmSignUp } from "@aws-amplify/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion } from "framer-motion";
import "../../src/lib/amplifyClient";

function VerifyPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "";

  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      setSuccessMessage("✅ アカウント確認が完了しました！");

      // ログインページへリダイレクト
      setTimeout(() => {
        router.push("/login/user");
      }, 2000);
    } catch (error: any) {
      console.error("Verify error:", error);
      setErrorMessage(error.message || "確認に失敗しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">メール確認</h1>
          <p className="text-gray-600">
            {email} 宛に送信された確認コードを入力してください。
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-5">
          <div>
            <label htmlFor="code" className="block text-sm font-semibold text-gray-700 mb-2">
              確認コード
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none transition-colors"
              placeholder="6桁の確認コード"
              required
            />
          </div>

          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !code}
            className={`w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-lg font-semibold transition-all duration-300 ${
              isSubmitting || !code
                ? "opacity-50 cursor-not-allowed"
                : "hover:from-purple-700 hover:to-pink-600"
            }`}
          >
            {isSubmitting ? "確認中..." : "確認"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            確認コードが届いていない場合は、迷惑メールフォルダをご確認ください。
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    }>
      <VerifyPageContent />
    </Suspense>
  );
}
