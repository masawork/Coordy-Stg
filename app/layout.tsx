import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "../src/lib/amplifyClient";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Coordy - 時間を整える。つながりをつくる。",
  description: "予約・タスク・スケジュール管理プラットフォーム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
