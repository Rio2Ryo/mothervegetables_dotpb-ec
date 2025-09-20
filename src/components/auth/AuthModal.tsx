'use client';

// import { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { Button } from '@/components/ui/button';

export function AuthModal() {
  const { modal, closeModal, switchModalMode } = useAuthStore();

  return (
    <Dialog.Root open={modal.isOpen} onOpenChange={(open) => {
      if (!open) {
        closeModal();
      }
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg">
          <Dialog.Title className="sr-only">
            {modal.mode === 'login' ? 'ログイン' : '新規登録'}
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            {modal.mode === 'login' ? 'アカウントにログインしてください' : '新しいアカウントを作成してください'}
          </Dialog.Description>
          
          <div className="flex justify-end">
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>
          
          {modal.mode === 'login' ? (
            <LoginForm onSwitchToRegister={switchModalMode} />
          ) : (
            <RegisterForm onSwitchToLogin={switchModalMode} />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
