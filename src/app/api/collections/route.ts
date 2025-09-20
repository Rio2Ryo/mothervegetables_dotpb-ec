import { NextRequest, NextResponse } from 'next/server';
import { shopifyClient } from '@/lib/shopify-client';
import { GET_COLLECTIONS } from '@/lib/shopify-queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const first = parseInt(searchParams.get('first') || '20');
    const after = searchParams.get('after') || undefined;

    const result = await shopifyClient.query({
      query: GET_COLLECTIONS,
      variables: {
        first,
        after,
      },
    });

    if (result.error) {
      console.error('Shopify GraphQL Error:', result.error);
      return NextResponse.json(
        { error: 'Failed to fetch collections', details: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
