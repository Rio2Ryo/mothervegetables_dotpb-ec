import { NextRequest, NextResponse } from 'next/server';
import { Alchemy, Network } from 'alchemy-sdk';

const config = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_SEPOLIA, // TestNet
};
const alchemy = new Alchemy(config);

export async function GET() {
  try {
    const blockNumber = await alchemy.core.getBlockNumber();
    const testAddress = '0x742d35Cc6634C0532925a3b8D9A6E2e2e2e2e2e2e2'; // Sepolia faucet address
    const balance = await alchemy.core.getBalance(testAddress);

    return NextResponse.json({
      success: true,
      message: 'Alchemy TestNet接続成功！',
      data: {
        network: config.network,
        latestBlock: blockNumber,
        testAddress: testAddress,
        balance: balance.toString(),
        alchemyConnected: true,
      },
    });
  } catch (error) {
    console.error('Alchemy test error:', error);
    return NextResponse.json(
      { success: false, error: 'Alchemy接続エラー', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId is required' }, { status: 400 });
    }

    // ここでMASTER_XPUBから派生アドレスを生成するロジックを実装
    // 現時点ではダミーアドレスを返す
    const receivingAddress = `0x${Math.random().toString(16).substring(2, 42)}`;

    return NextResponse.json({
      success: true,
      message: '受取アドレス生成成功！',
      data: {
        orderId,
        receivingAddress,
        network: config.network,
      },
    });
  } catch (error) {
    console.error('Alchemy address generation error:', error);
    return NextResponse.json(
      { success: false, error: 'アドレス生成エラー', details: (error as Error).message },
      { status: 500 }
    );
  }
}

