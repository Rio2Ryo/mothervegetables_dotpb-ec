import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DiscountError } from '@/types/agent-discount';

interface AgentState {
  currentAgentCode: string | null;
  isDetected: boolean;

  // 割引関連の状態
  couponCode: string | null;
  discountApplied: boolean;
  discountError: DiscountError | null;

  // アクション
  setAgentCode: (code: string | null) => void;
  setCurrentAgent: (code: string, couponCode: string | null) => void;
  detectAgentFromUrl: (pathname: string) => void;
  clearAgent: () => void;

  // 割引関連のアクション
  setCouponCode: (code: string | null) => void;
  setDiscountApplied: (applied: boolean) => void;
  setDiscountError: (error: DiscountError | null) => void;
  clearDiscountError: () => void;
  resetDiscount: () => void;
}

const AGENT_STORAGE_KEY = 'current_agent_code';

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      currentAgentCode: null,
      isDetected: false,
      
      // 割引関連の初期状態
      couponCode: null,
      discountApplied: false,
      discountError: null,

      setAgentCode: (code: string | null) => {
        console.log('[AgentStore] Setting agent code:', code);
        set({
          currentAgentCode: code,
          isDetected: code !== null
        });
      },

      setCurrentAgent: (code: string, couponCode: string | null) => {
        console.log('[AgentStore] Setting current agent:', code, couponCode);
        set({
          currentAgentCode: code,
          isDetected: true,
          couponCode: couponCode,
          discountApplied: false,
          discountError: null
        });
      },

      detectAgentFromUrl: (pathname: string) => {
        // URLパターン: /[code] または /[code]/...
        // ただし、特定のルートパスは除外（products, api, checkout等）
        const excludedPaths = [
          'products', 'api', 'checkout', 'cart', 'auth', 
          'login', 'register', 'admin', '_next', 'static', 'test'
        ];
        
        const segments = pathname.split('/').filter(Boolean);
        
        if (segments.length > 0) {
          const firstSegment = segments[0];
          
          // 除外パスでない場合は代理店コードとして扱う
          if (!excludedPaths.includes(firstSegment)) {
            const currentCode = get().currentAgentCode;
            
            // 新しいコードが検出された場合のみ更新
            if (currentCode !== firstSegment) {
              console.log('[AgentStore] Detected new agent code:', firstSegment);
              set({ 
                currentAgentCode: firstSegment, 
                isDetected: true 
              });
            }
            return;
          }
        }
        
        // 代理店ページでない場合は何もしない（既存のコードを保持）
      },

      clearAgent: () => {
        console.log('[AgentStore] Clearing agent');
        set({ 
          currentAgentCode: null, 
          isDetected: false 
        });
      },

      // 割引関連のアクション
      setCouponCode: (code: string | null) => {
        console.log('[AgentStore] Setting coupon code:', code);
        set({ couponCode: code });
      },

      setDiscountApplied: (applied: boolean) => {
        console.log('[AgentStore] Setting discount applied:', applied);
        set({ discountApplied: applied });
      },

      setDiscountError: (error: DiscountError | null) => {
        console.log('[AgentStore] Setting discount error:', error);
        set({ discountError: error });
      },

      clearDiscountError: () => {
        console.log('[AgentStore] Clearing discount error');
        set({ discountError: null });
      },

      resetDiscount: () => {
        console.log('[AgentStore] Resetting discount');
        set({ 
          couponCode: null,
          discountApplied: false,
          discountError: null 
        });
      },

      clearAgent: () => {
        console.log('[AgentStore] Clearing agent');
        set({ 
          currentAgentCode: null, 
          isDetected: false,
          couponCode: null,
          discountApplied: false,
          discountError: null
        });
      },
    }),
         {
           name: AGENT_STORAGE_KEY,
           partialize: (state) => ({ 
             currentAgentCode: state.currentAgentCode,
             isDetected: state.isDetected,
             // 割引関連の状態も永続化対象に追加
             couponCode: state.couponCode,
             discountApplied: state.discountApplied
             // discountErrorは永続化しない（セッション内のみ）
           }),
         }
  )
);
