"use client";

import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

/**
 * Amplify Client Configuration
 *
 * This file initializes Amplify configuration on the client side.
 * It should be imported once in the root layout to ensure proper initialization.
 *
 * Note: Amplify Gen2 v6 requires explicit Auth.Cognito configuration.
 * The amplify_outputs.json uses snake_case keys which need to be mapped
 * to the camelCase format expected by Amplify.configure().
 */

const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: outputs.auth.user_pool_id,
      userPoolClientId: outputs.auth.user_pool_client_id,
      identityPoolId: outputs.auth.identity_pool_id,
      region: outputs.auth.aws_region,
    }
  }
};

// Configure Amplify with SSR support
Amplify.configure(amplifyConfig, {
  ssr: true,
});

console.log("✅ Amplify認証初期化完了");

export default Amplify;
