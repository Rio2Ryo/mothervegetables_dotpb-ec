export interface Agent {
  id: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  revisedAt: string;
  code: string;
  name: string;
  description: string;
  coupon_code?: string; // 代理店割引システム用のクーポンコード
  // 必要に応じて、microCMSで定義する代理店情報のフィールドを追加
}

export interface MicroCMSListResponse<T> {
  contents: T[];
  totalCount: number;
  offset: number;
  limit: number;
}
