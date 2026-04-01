import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "scripts/**",
      "prisma/migrations/**",
      "supabase/**",
    ],
  },
];

export default eslintConfig;
