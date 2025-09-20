'use client'

import { FaGlobe, FaClock, FaSolarPanel, FaShield, FaChartLine, FaHandshake, FaRocket } from 'react-icons/fa6'

export default function PlatformOverview() {
  const marketPositions = [
    {
      icon: <FaGlobe className="w-6 h-6" />,
      title: "グローバル展開：8カ国、70の運営施設"
    },
    {
      icon: <FaClock className="w-6 h-6" />,
      title: "技術ステータス：24時間365日自律運転による実証済み商業的実用性"
    },
    {
      icon: <FaSolarPanel className="w-6 h-6" />,
      title: "統合システム：太陽光発電および蓄電システムの統合"
    },
    {
      icon: <FaShield className="w-6 h-6" />,
      title: "実証データ：安定かつ効率的なCO₂吸収能力の実証"
    }
  ]

  return (
    <section id="platform-overview" className="py-32 bg-gradient-to-b from-black to-gray-900">
      <div className="container mx-auto px-4">

        {/* 市場における地位 */}
        <div className="mb-24">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-12 text-center">
            市場における地位
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {marketPositions.map((position, index) => (
              <div
                key={index}
                className="bg-gray-800/50 backdrop-blur-md border border-gray-700/50 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-300"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 flex-shrink-0">
                    {position.icon}
                  </div>
                  <p className="text-gray-300 font-medium">{position.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 投資機会 */}
        <div>
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center">
            投資機会
          </h3>
          <p className="text-gray-300 text-sm md:text-base max-w-4xl mx-auto text-center mb-12 leading-relaxed">
            本プロジェクトは、Initial Exchange Offering（IEO）メカニズムとブロックチェーンベースのNFTシステムを活用し、透明性のある測定可能な環境インパクトを提供しながら、CO₂吸収連動型リワードシステムを通じてトークンホルダーに経済的リターンを創出します。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-md border border-purple-500/30 rounded-xl p-6 text-center">
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 mb-4 mx-auto">
                <FaChartLine className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">IEOメカニズム</h3>
              <p className="text-gray-300 text-sm">規制準拠した透明性の高い資金調達</p>
            </div>

            <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 backdrop-blur-md border border-blue-500/30 rounded-xl p-6 text-center">
              <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-4 mx-auto">
                <FaHandshake className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">NFTシステム</h3>
              <p className="text-gray-300 text-sm">環境貢献の可視化と資産価値創出</p>
            </div>

            <div className="bg-gradient-to-br from-cyan-900/20 to-emerald-900/20 backdrop-blur-md border border-emerald-500/30 rounded-xl p-6 text-center">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 mb-4 mx-auto">
                <FaRocket className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">リワードシステム</h3>
              <p className="text-gray-300 text-sm">CO₂吸収量連動の経済的インセンティブ</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}