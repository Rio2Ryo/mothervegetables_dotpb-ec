import { NextRequest, NextResponse } from 'next/server';
import { shopifyClient } from '@/lib/shopify-client';
import { GET_PRODUCTS } from '@/lib/shopify-queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const first = parseInt(searchParams.get('first') || '20');
    const after = searchParams.get('after') || undefined;
    const query = searchParams.get('query') || undefined;
    const sortKey = searchParams.get('sortKey') as any || 'CREATED_AT';
    const reverse = searchParams.get('reverse') === 'true';

    const { data, error } = await shopifyClient.query({
      query: GET_PRODUCTS,
      variables: {
        first,
        after,
        query,
        sortKey,
        reverse,
      },
    });

    if (error) {
      console.error('Shopify GraphQL Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch products', details: error.message },
        { status: 500 }
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
