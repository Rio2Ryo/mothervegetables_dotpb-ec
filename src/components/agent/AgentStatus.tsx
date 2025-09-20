'use client';

import { useAgentStore } from '@/stores/agentStore';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';

export function AgentStatus() {
  const { 
    currentAgentCode, 
    isDetected, 
    couponCode, 
    discountError 
  } = useAgentStore();

  if (!isDetected || !currentAgentCode) {
    return null;
  }

  if (discountError) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {discountError.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="mb-4">
      <CheckCircle className="h-4 w-4" />
      <AlertDescription>
        代理店コード <Badge variant="outline">{currentAgentCode}</Badge> が検出されました
        {couponCode && (
          <span className="ml-2">
            - 割引コード: <Badge variant="secondary">{couponCode}</Badge>
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
}
