'use client';

import { useAgentStore } from '@/stores/agentStore';
import { Badge } from '@/components/ui/badge';

export function AgentDiscountBadge() {
  const { currentAgentCode, isDetected, couponCode } = useAgentStore();

  if (!isDetected || !currentAgentCode) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Badge variant="secondary" className="bg-green-100 text-green-800">
        代理店価格
      </Badge>
      {couponCode && (
        <span className="text-muted-foreground">
          コード: {couponCode}
        </span>
      )}
    </div>
  );
}
