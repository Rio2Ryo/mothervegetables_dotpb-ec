import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-green-500 mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-4">ページが見つかりません</h2>
        <p className="text-gray-400 mb-8">
          指定された代理店コードは登録されていません。<br />
          正しい代理店コードをご確認ください。
        </p>
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-block bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            トップページへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}