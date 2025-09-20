import { NextRequest, NextResponse } from 'next/server';
import { shopifyClient } from '@/lib/shopify-client';
import { GET_COLLECTION_BY_HANDLE } from '@/lib/shopify-queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const { searchParams } = new URL(request.url);
    const first = parseInt(searchParams.get('first') || '20');
    const after = searchParams.get('after') || undefined;

    if (!handle) {
      return NextResponse.json(
        { error: 'Collection handle is required' },
        { status: 400 }
      );
    }

    const result = await shopifyClient.query({
      query: GET_COLLECTION_BY_HANDLE,
      variables: { handle, first, after },
    });

    if (result.error) {
      console.error('Shopify GraphQL Error:', result.error);
      return NextResponse.json(
        { error: 'Failed to fetch collection', details: result.error.message },
        { status: 500 }
      );
    }

    if (!result.data.collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
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
