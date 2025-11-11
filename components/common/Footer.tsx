export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>📝</span>
              <span>Coordy</span>
            </h3>
            <p className="text-sm text-gray-400">
              あなたの時間を、もっと価値あるものに
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">サービス</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">カテゴリー一覧</a></li>
              <li><a href="#" className="hover:text-white transition-colors">インストラクター検索</a></li>
              <li><a href="#" className="hover:text-white transition-colors">料金プラン</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">サポート</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">ヘルプセンター</a></li>
              <li><a href="#" className="hover:text-white transition-colors">お問い合わせ</a></li>
              <li><a href="#" className="hover:text-white transition-colors">よくある質問</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">会社情報</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">会社概要</a></li>
              <li><a href="#" className="hover:text-white transition-colors">利用規約</a></li>
              <li><a href="#" className="hover:text-white transition-colors">プライバシーポリシー</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
          <p>© 2025 Coordy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
