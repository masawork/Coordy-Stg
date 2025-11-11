"use client";
import { signUp } from "@aws-amplify/auth";
import { useRouter } from "next/navigation";
import "../../../test/lib/amplifyClient";

export default function TestSignupPage() {
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;
    const role = formData.get("role") as string;

    // ロールに応じた属性値のマッピング
    const roleMapping: Record<string, { userType: string; cognitoGroup: string }> = {
      CLIENT: { userType: "client", cognitoGroup: "CLIENTS" },
      CREATOR: { userType: "creator", cognitoGroup: "CREATORS" },
    };

    const { userType, cognitoGroup } = roleMapping[role] || roleMapping.CLIENT;

    try {
      const result = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            name,
            "custom:userType": userType,
            "custom:role": cognitoGroup,
          },
        },
      });

      console.log(`✅ 登録成功: ${email}`, result);

      // 成功時の遷移（確認画面へ）
      alert(`✅ 登録が完了しました\nメールアドレス: ${email}\nロール: ${role === "CLIENT" ? "クライアント" : "クリエイター"}`);
      router.push("/test/verify?email=" + encodeURIComponent(email));
    } catch (error: any) {
      console.error("Signup error:", error);
      alert("❌ 登録に失敗しました: " + error.message);
    }
  }

  return (
    <main className="flex flex-col items-center p-8">
      <h1 className="text-2xl font-bold mb-4">テストユーザー登録（ロール機能テスト）</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-80">
        <input
          name="email"
          type="email"
          placeholder="メールアドレス"
          required
          className="border p-2 rounded"
        />
        <input
          name="name"
          type="text"
          placeholder="名前（任意）"
          className="border p-2 rounded"
        />
        <input
          name="password"
          type="password"
          placeholder="パスワード"
          required
          className="border p-2 rounded"
        />
        <select
          name="role"
          required
          className="border p-2 rounded bg-white"
          defaultValue="CLIENT"
        >
          <option value="CLIENT">クライアント</option>
          <option value="CREATOR">クリエイター</option>
        </select>
        <button
          type="submit"
          className="bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          新規登録
        </button>
      </form>
      <div className="mt-4 text-sm text-gray-600">
        <p>※ このページは /test 環境専用です</p>
        <p>※ ロール属性が Cognito に保存されます</p>
      </div>
    </main>
  );
}
