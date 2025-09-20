import { NextRequest, NextResponse } from 'next/server';
import { shopifyClient } from '@/lib/shopify-client';
import { SEARCH_PRODUCTS } from '@/lib/shopify-queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const first = parseInt(searchParams.get('first') || '20');
    const after = searchParams.get('after') || undefined;

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const result = await shopifyClient.query({
      query: SEARCH_PRODUCTS,
      variables: {
        query,
        first,
        after,
      },
    });

    if (result.error) {
      console.error('Shopify GraphQL Error:', result.error);
      return NextResponse.json(
        { error: 'Failed to search products', details: result.error.message },
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
