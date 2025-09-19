import { NextRequest, NextResponse } from 'next/server';
import { shopifyClient } from '@/lib/shopify-client';
import { GET_PRODUCT_BY_HANDLE } from '@/lib/shopify-queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    console.log('🔍 API Route - original handle:', handle);

    if (!handle) {
      console.log('❌ API Route - No handle provided');
      return NextResponse.json(
        { error: 'Product handle is required' },
        { status: 400 }
      );
    }

    // URLエンコードされたhandleをデコード
    const decodedHandle = decodeURIComponent(handle);
    console.log('🔍 API Route - decoded handle:', decodedHandle);

    console.log('🔍 API Route - Querying Shopify with handle:', decodedHandle);
    const { data, error } = await shopifyClient.query({
      query: GET_PRODUCT_BY_HANDLE,
      variables: { handle: decodedHandle },
    });

    console.log('🔍 API Route - Shopify response:', { data, error });

    if (error) {
      console.error('Shopify GraphQL Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch product', details: error.message },
        { status: 500 }
      );
    }

    if (!data.product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
