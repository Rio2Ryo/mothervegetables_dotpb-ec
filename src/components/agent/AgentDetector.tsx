'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAgentStore } from '@/stores/agentStore';
import { useCart } from '@/contexts/CartContext';

/**
 * エージェントデータをAPIから取得する関数
 */
async function fetchAgentData(agentCode: string) {
  try {
    const response = await fetch(`/api/agents?code=${agentCode}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // エージェントが見つからない場合
      }
      throw new Error(`Failed to fetch agent data: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching agent data:', error);
    throw error;
  }
}

/**
 * URLから代理店コードを自動検出し、ストアに設定するコンポーネント
 * このコンポーネントは各ページで自動的に実行され、
 * ユーザーに見えないバックグラウンドで動作します
 */
export default function AgentDetector() {
  const pathname = usePathname();
  const { detectAgentFromUrl, currentAgentCode, setCouponCode, setDiscountError } = useAgentStore();
  const { setAgentCode } = useCart();

  useEffect(() => {
    // パスが変更されるたびに代理店コードの検出を実行
    detectAgentFromUrl(pathname);
  }, [pathname, detectAgentFromUrl]);

  // エージェントコードが変更された時にクーポンコードを取得
  useEffect(() => {
    const fetchAndSetAgentData = async () => {
      if (!currentAgentCode) {
        // エージェントコードがクリアされた時はクーポンコードもクリア
        setCouponCode(null);
        setAgentCode(null); // カートからも代理店コードをクリア
        return;
      }

      // カートに代理店コードを設定
      setAgentCode(currentAgentCode);

      try {
        const agentData = await fetchAgentData(currentAgentCode);
        
        if (agentData?.agent?.coupon_code) {
          setCouponCode(agentData.agent.coupon_code);
          setDiscountError(null); // エラーをクリア
        } else {
          console.warn('[AgentDetector] No coupon code found for agent:', currentAgentCode);
          setCouponCode(null);
        }
      } catch (error) {
        console.error('[AgentDetector] Error fetching agent data:', error);
        setCouponCode(null);
        setDiscountError({
          type: 'AGENT_FETCH_ERROR',
          message: 'エージェントデータの取得に失敗しました',
          timestamp: new Date()
        });
      }
    };

    fetchAndSetAgentData();
  }, [currentAgentCode, setCouponCode, setDiscountError]);

  // このコンポーネントは何もレンダリングしない
  return null;
}
