"use client";
import { confirmSignUp } from "@aws-amplify/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import "../../../test/lib/amplifyClient";

function VerifyPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "";

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const code = formData.get("code") as string;

    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      alert("✅ アカウント確認が完了しました！");
      router.push("/test/login");
    } catch (error: any) {
      console.error("Verify error:", error);
      alert("❌ 確認に失敗しました: " + error.message);
    }
  }

  return (
    <main className="flex flex-col items-center p-8">
      <h1 className="text-2xl font-bold mb-4">メール確認コード入力</h1>
      <p className="text-gray-600 mb-4">
        {email} 宛に送信された確認コードを入力してください。
      </p>
      <form onSubmit={handleVerify} className="flex flex-col gap-3 w-80">
        <input
          name="code"
          type="text"
          placeholder="確認コード（6桁）"
          required
          className="border p-2 rounded"
        />
        <button
          type="submit"
          className="bg-green-500 text-white py-2 rounded hover:bg-green-600"
        >
          確認
        </button>
      </form>
      <div className="mt-4 text-center">
        <a href="/test/signup" className="text-blue-500 hover:text-blue-700">
          ← 新規登録に戻る
        </a>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8">読み込み中...</div>}>
      <VerifyPageContent />
    </Suspense>
  );
}
