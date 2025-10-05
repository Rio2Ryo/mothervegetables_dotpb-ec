import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Customer } from '@/services/shopify/types';
import type { LoginFormData, RegisterFormData } from '@/lib/validations/auth';

interface AuthModal {
  isOpen: boolean;
  mode: 'login' | 'register';
  context: 'header' | 'checkout' | 'page';
}

interface AuthState {
  // 状態
  customer: Customer | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  modal: AuthModal;

  // アクション
  login: (credentials: LoginFormData) => Promise<boolean>;
  register: (data: RegisterFormData) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  
  // モーダル管理
  openModal: (mode: 'login' | 'register', context?: 'header' | 'checkout' | 'page') => void;
  closeModal: () => void;
  switchModalMode: () => void;
  
  // エラー管理
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
      // 初期状態
      customer: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      modal: {
        isOpen: false,
        mode: 'login',
        context: 'header',
      },

      // 認証アクション
      login: async (credentials: LoginFormData) => {
        set({ loading: true, error: null });
        
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            set({
              customer: data.customer,
              isAuthenticated: true,
              loading: false,
              modal: { ...get().modal, isOpen: false },
            });
            return true;
          } else {
            set({
              error: data.message || 'ログインに失敗しました',
              loading: false,
            });
            return false;
          }
        } catch (error) {
          console.error('Login error:', error);
          set({
            error: 'ネットワークエラーが発生しました',
            loading: false,
          });
          return false;
        }
      },

      register: async (data: RegisterFormData) => {
        set({ loading: true, error: null });
        
        try {
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });

          const result = await response.json();

          if (response.ok && result.success) {
            set({
              customer: result.customer,
              isAuthenticated: true,
              loading: false,
              modal: { ...get().modal, isOpen: false },
            });
            return true;
          } else {
            set({
              error: result.message || '新規登録に失敗しました',
              loading: false,
            });
            return false;
          }
        } catch (error) {
          console.error('Register error:', error);
          set({
            error: 'ネットワークエラーが発生しました',
            loading: false,
          });
          return false;
        }
      },

      logout: async () => {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
          });

          set({
            customer: null,
            isAuthenticated: false,
            modal: { ...get().modal, isOpen: false },
          });
        } catch (error) {
          console.error('Logout error:', error);
        }
      },

      checkAuth: async () => {
        set({ loading: true });
        
        try {
          const response = await fetch('/api/auth/me');
          const data = await response.json();

          if (response.ok && data.success) {
            set({
              customer: data.customer,
              isAuthenticated: true,
              loading: false,
            });
          } else {
            // 401エラーは正常な状態（未認証）なので、エラーとして扱わない
            set({
              customer: null,
              isAuthenticated: false,
              loading: false,
            });
          }
        } catch (error) {
          // ネットワークエラーの場合のみログ出力
          if (error instanceof TypeError) {
            console.error('Network error during auth check:', error);
          }
          set({
            customer: null,
            isAuthenticated: false,
            loading: false,
          });
        }
      },

      // モーダル管理
      openModal: (mode: 'login' | 'register', context: 'header' | 'checkout' | 'page' = 'header') => {
        set({
          modal: {
            isOpen: true,
            mode,
            context,
          },
          error: null,
        });
      },

      closeModal: () => {
        set({
          modal: { ...get().modal, isOpen: false },
          error: null,
        });
      },

      switchModalMode: () => {
        set({
          modal: {
            ...get().modal,
            mode: get().modal.mode === 'login' ? 'register' : 'login',
          },
          error: null,
        });
      },

      // エラー管理
      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },
      }),
      {
        name: 'auth-store',
        partialize: (state) => ({
          customer: state.customer,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'auth-store-devtools',
    }
  )
);
