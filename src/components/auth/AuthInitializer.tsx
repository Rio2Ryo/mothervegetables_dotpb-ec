'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

/**
 * 認証状態を初期化するコンポーネント
 * アプリケーション起動時に認証状態をチェックします
 */
export function AuthInitializer() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // アプリケーション起動時に認証状態をチェック
    // エラーが発生してもアプリケーションは正常に動作させる
    checkAuth().catch((error) => {
      console.log('Auth check failed (this is normal for unauthenticated users):', error);
    });
  }, [checkAuth]);

  return null;
}
