import { createClient } from 'microcms-js-sdk';
import type { MicroCMSListResponse, Agent } from '@/types/microcms';

if (!process.env.MICROCMS_SERVICE_DOMAIN) {
  throw new Error('MICROCMS_SERVICE_DOMAIN is not defined');
}

if (!process.env.MICROCMS_API_KEY) {
  throw new Error('MICROCMS_API_KEY is not defined');
}

export const client = createClient({
  serviceDomain: process.env.MICROCMS_SERVICE_DOMAIN,
  apiKey: process.env.MICROCMS_API_KEY,
});

// 代理店情報をコードで取得する関数
export const getAgentByCode = async (
  code: string,
  options?: { revalidate?: number }
): Promise<Agent | null> => {
  try {
    const response = await client.get<MicroCMSListResponse<Agent>>({
      endpoint: 'agents', // microCMSのAPIエンドポイント名に合わせてください
      queries: { filters: `code[equals]${code}` },
      customRequestInit: options?.revalidate
        ? { next: { revalidate: options.revalidate } }
        : undefined,
    });
    return response.contents.length > 0 ? response.contents[0] : null;
  } catch (error) {
    console.error('Error fetching agent by code:', error);
    return null;
  }
};

// すべての代理店コードを取得する関数 (generateStaticParams用)
export const getAllAgentCodes = async (): Promise<string[]> => {
  try {
    const response = await client.get<MicroCMSListResponse<Agent>>({
      endpoint: 'agents',
      queries: { fields: 'code', limit: 100 }, // microCMSの制限に合わせて100に設定
      customRequestInit: { next: { revalidate: 3600 } }, // 1時間ごとに再生成を試みる
    });
    return response.contents.map((agent) => agent.code);
  } catch (error) {
    console.error('Error fetching all agent codes:', error);
    return [];
  }
};
