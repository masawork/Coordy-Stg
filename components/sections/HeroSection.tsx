import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white overflow-hidden pt-14">
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
        <div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            予約から受講まで、<br />
            すべてをシンプルに
          </h1>
        </div>

        <div>
          <p className="text-xl md:text-2xl mb-12 text-white/90 max-w-3xl mx-auto">
            レッスン・セッション予約のための新しいプラットフォーム
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
          <Link href="/login/user">
            <button className="text-lg px-10 py-4 font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white w-full sm:w-auto">
              レッスンを受けたい方
            </button>
          </Link>
          <Link href="/login/instructor">
            <button className="text-lg px-10 py-4 font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white w-full sm:w-auto">
              講師・トレーナーの方
            </button>
          </Link>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center items-start pt-2">
            <div className="w-1 h-3 bg-white/80 rounded-full"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
