import { notFound } from 'next/navigation';
import { getAgentByCode } from '@/lib/microcms/client';
import AgentPageClient from './AgentPageClient';

interface PageProps {
  params: Promise<{
    agentCode: string;
  }>;
}

export default async function AgentPage({ params }: PageProps) {
  const { agentCode } = await params;

  // microCMSから代理店情報を取得
  const agent = await getAgentByCode(agentCode);

  // 代理店が存在しない場合は404エラーを表示
  if (!agent) {
    notFound();
  }

  // 代理店情報をクライアントコンポーネントに渡す
  return <AgentPageClient agent={agent} agentCode={agentCode} />;
}
