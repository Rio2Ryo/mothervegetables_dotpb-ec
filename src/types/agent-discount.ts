export interface DiscountError {
  type: 'AGENT_FETCH_ERROR' | 'COUPON_APPLY_ERROR' | 'DISCOUNT_CALCULATION_ERROR';
  message: string;
  timestamp: Date;
}

export interface AgentDiscountState {
  currentAgentCode: string | null;
  isDetected: boolean;
  couponCode: string | null;
  discountApplied: boolean;
  discountError: DiscountError | null;
}
