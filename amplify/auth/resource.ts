import { defineAuth } from "@aws-amplify/backend";
import { postConfirmation } from "../functions/post-confirmation/resource";

/**
 * Coordy 認証設定
 * - 標準属性（email, name）はデフォルトで利用可能
 * - カスタム属性でクライアント/クリエイターロールを管理
 * - Post Confirmation トリガーでCognitoグループに自動追加
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    // カスタム属性（本番環境で使用）
    "custom:userType": {
      dataType: "String",
      mutable: true,
    },
    "custom:role": {
      dataType: "String",
      mutable: true,
    },
  },
  groups: ["CLIENTS", "CREATORS", "ADMINS"],
  triggers: {
    postConfirmation,
  },
});
