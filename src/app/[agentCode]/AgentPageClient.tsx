'use client';

import { useEffect, useState } from 'react';
import { useAgentStore } from '@/stores/agentStore';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import ProductCards from '@/components/ProductCards';
import ProjectOverview from '@/components/ProjectOverview';
import IndustryApproach from '@/components/IndustryApproach';
import TeamMembers from '@/components/TeamMembers';
import Partners from '@/components/Partners';
import TokenInfo from '@/components/TokenInfo';
import Footer from '@/components/Footer';
import LoadingScreen from '@/components/LoadingScreen';
import { AgentDiscountBadge } from '@/components/agent/AgentDiscountBadge';
import type { Agent } from '@/types/microcms';

interface AgentPageClientProps {
  agent: Agent;
  agentCode: string;
}

export default function AgentPageClient({ agent }: AgentPageClientProps) {
  const { setCurrentAgent } = useAgentStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 代理店情報をストアに保存
    setCurrentAgent(agent.code, agent.coupon_code || null);

    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [agent, setCurrentAgent]);

  return (
    <>
      {isLoading && <LoadingScreen />}
      <main className="min-h-screen text-white relative">
        <Header />

        {/* 代理店情報バナー */}
        <div className="fixed top-20 left-0 right-0 z-40 bg-gradient-to-r from-blue-600 to-purple-600 py-3 px-4">
          <div className="container mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <span className="text-xs sm:text-sm font-semibold text-center sm:text-left">
                  代理店経由でアクセス中
                </span>
                <span className="bg-white text-blue-600 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
                  {agent.name}
                </span>
              </div>
              {agent.coupon_code && (
                <div className="text-xs sm:text-sm flex items-center">
                  <span className="mr-2">特別割引適用中</span>
                  <AgentDiscountBadge />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* トップページのコンテンツ (バナー分下にずらす) */}
        <div className="pt-20 sm:pt-12">
          <Hero />
          <ProductCards />
          <ProjectOverview />
          <IndustryApproach />
          <TeamMembers />
          <Partners />
          <TokenInfo />
        </div>
        <Footer />
      </main>
    </>
  );
}