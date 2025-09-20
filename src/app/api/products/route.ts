import { NextRequest, NextResponse } from 'next/server';
import { shopifyClient } from '@/lib/shopify-client';
import { GET_PRODUCTS } from '@/lib/shopify-queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const first = parseInt(searchParams.get('first') || '20');
    const after = searchParams.get('after') || undefined;
    const query = searchParams.get('query') || undefined;
    const sortKey = (searchParams.get('sortKey') as 'CREATED_AT' | 'TITLE' | 'PRICE' | 'RELEVANCE') || 'CREATED_AT';
    const reverse = searchParams.get('reverse') === 'true';

    const result = await shopifyClient.query({
      query: GET_PRODUCTS,
      variables: {
        first,
        after,
        query,
        sortKey,
        reverse,
      },
    });

    if (result.error) {
      console.error('Shopify GraphQL Error:', result.error);
      return NextResponse.json(
        { error: 'Failed to fetch products', details: result.error.message },
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
