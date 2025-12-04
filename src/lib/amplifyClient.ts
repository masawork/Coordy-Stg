"use client";

import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

/**
 * Amplify Client Configuration
 *
 * This file initializes Amplify configuration on the client side.
 * It should be imported once in the root layout to ensure proper initialization.
 *
 * Amplify Gen2 configuration includes:
 * - Auth (Cognito)
 * - API (GraphQL/AppSync)
 */

// Amplify.configure() に直接 outputs を渡す
// Amplify Gen2 では amplify_outputs.json の形式がそのまま使える
Amplify.configure(outputs, {
  ssr: true,
});

console.log("✅ Amplify 初期化完了 (Auth + Data)");

export default Amplify;
