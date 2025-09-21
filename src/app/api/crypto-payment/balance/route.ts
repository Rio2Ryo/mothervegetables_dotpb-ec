import { NextRequest, NextResponse } from 'next/server'
import { checkWalletBalance } from '@/lib/crypto-payment'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('address')

    if (!walletAddress) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Wallet address is required' 
        },
        { status: 400 }
      )
    }

    // ウォレットの残高を確認
    const balance = await checkWalletBalance(walletAddress)

    return NextResponse.json({
      success: true,
      balance: balance
    })
  } catch (error) {
    console.error('Error checking wallet balance:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check wallet balance' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address: walletAddress } = body

    if (!walletAddress) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Wallet address is required' 
        },
        { status: 400 }
      )
    }

    // ウォレットの残高を確認
    const balance = await checkWalletBalance(walletAddress)

    return NextResponse.json({
      success: true,
      balance: balance
    })
  } catch (error) {
    console.error('Error checking wallet balance:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check wallet balance' 
      },
      { status: 500 }
    )
  }
}
