"use client";
import { useState } from "react";
import { confirmSignUp, resendSignUpCode } from "@aws-amplify/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import "../../src/lib/amplifyClient";

function VerifyPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "";

  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      setSuccessMessage("✅ アカウント確認が完了しました！ログイン画面に移動します...");

      // クライアントログインページへリダイレクト
      setTimeout(() => {
        router.push("/login/user");
      }, 2000);
    } catch (error: any) {
      console.error("Verify error:", error);

      // エラーメッセージを日本語化
      let friendlyMessage = "確認に失敗しました。もう一度お試しください。";
      if (error.name === "CodeMismatchException") {
        friendlyMessage = "確認コードが正しくありません。もう一度入力してください。";
      } else if (error.name === "ExpiredCodeException") {
        friendlyMessage = "確認コードの有効期限が切れています。再送信してください。";
      } else if (error.name === "NotAuthorizedException") {
        friendlyMessage = "このアカウントは既に確認済みです。ログインしてください。";
      } else if (error.message) {
        friendlyMessage = error.message;
      }

      setErrorMessage(friendlyMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendCode() {
    if (!email) {
      setErrorMessage("メールアドレスが指定されていません。");
      return;
    }

    setIsResending(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await resendSignUpCode({ username: email });
      setSuccessMessage("✅ 確認コードを再送信しました。メールをご確認ください。");
    } catch (error: any) {
      console.error("Resend code error:", error);

      let friendlyMessage = "確認コードの再送信に失敗しました。";
      if (error.name === "LimitExceededException") {
        friendlyMessage = "再送信の試行回数が上限に達しました。しばらく待ってから再度お試しください。";
      } else if (error.message) {
        friendlyMessage = error.message;
      }

      setErrorMessage(friendlyMessage);
    } finally {
      setIsResending(false);
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
            {email ? (
              <>
                <span className="font-semibold">{email}</span> 宛に送信された確認コードを入力してください。
              </>
            ) : (
              "確認コードを入力してください。"
            )}
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-5">
          <div>
            <label htmlFor="code" className="block text-sm font-semibold text-gray-700 mb-2">
              確認コード<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none transition-colors text-center text-2xl tracking-widest"
              placeholder="000000"
              maxLength={6}
              required
              autoComplete="off"
            />
            <p className="text-xs text-gray-500 mt-2">
              ※ メールに記載された6桁の数字を入力してください
            </p>
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
                : "hover:from-purple-700 hover:to-pink-600 shadow-lg hover:shadow-xl"
            }`}
          >
            {isSubmitting ? "確認中..." : "確認"}
          </button>
        </form>

        {/* 確認コード再送ボタン */}
        <div className="mt-6">
          <button
            type="button"
            onClick={handleResendCode}
            disabled={isResending || !email}
            className={`w-full px-4 py-2 border-2 border-purple-300 text-purple-700 rounded-lg font-semibold transition-all duration-300 ${
              isResending || !email
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-purple-50 hover:border-purple-400"
            }`}
          >
            {isResending ? "再送信中..." : "確認コードを再送信"}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm mb-3">
            確認コードが届いていない場合は、迷惑メールフォルダもご確認ください。
          </p>
          <div className="flex justify-center space-x-4 text-sm">
            <Link href="/login/user" className="text-purple-600 hover:text-purple-700 font-semibold">
              ログインページへ
            </Link>
            <span className="text-gray-400">|</span>
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              トップページへ
            </Link>
          </div>
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
