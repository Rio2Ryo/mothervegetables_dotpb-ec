import { NextRequest, NextResponse } from 'next/server';
import { shopifyClient } from '@/lib/shopify-client';
import { CREATE_CART_DETAILED, ADD_TO_CART, REMOVE_FROM_CART, GET_CART } from '@/lib/shopify-queries';

// カート作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lines } = body;

    if (!lines || !Array.isArray(lines)) {
      return NextResponse.json(
        { error: 'Cart lines are required' },
        { status: 400 }
      );
    }

    const { data, error } = await shopifyClient.mutate({
      mutation: CREATE_CART_DETAILED,
      variables: { lines },
    });

    if (error) {
      console.error('Shopify GraphQL Error:', error);
      return NextResponse.json(
        { error: 'Failed to create cart', details: error.message },
        { status: 500 }
      );
    }

    if (data.cartCreate.userErrors.length > 0) {
      return NextResponse.json(
        { error: 'Cart creation failed', userErrors: data.cartCreate.userErrors },
        { status: 400 }
      );
    }

    return NextResponse.json(data.cartCreate.cart);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// カート取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cartId = searchParams.get('cartId');

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await shopifyClient.query({
      query: GET_CART,
      variables: { cartId },
    });

    if (error) {
      console.error('Shopify GraphQL Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch cart', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data.cart);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// カート更新（追加・削除・置き換え）
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { cartId, lines, action } = body;

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      );
    }

    let mutation;
    let variables: any;

    if (action === 'add') {
      mutation = ADD_TO_CART;
      variables = { cartId, lines };
    } else if (action === 'remove') {
      mutation = REMOVE_FROM_CART;
      variables = { cartId, lineIds: lines };
    } else if (action === 'replace') {
      try {
        // カート全体を置き換える場合は、まず既存のラインを全て削除してから新しいラインを追加
        // 1. 既存のカートを取得
        const { data: cartData, error: cartError } = await shopifyClient.query({
          query: GET_CART,
          variables: { cartId },
        });

        if (cartError) {
          console.error('Cart fetch error:', cartError);
          throw new Error(`Failed to fetch cart: ${cartError.message}`);
        }

        // 2. 既存のラインIDを取得
        const existingLineIds = cartData.cart?.lines?.edges?.map((edge: any) => edge.node.id) || [];

        // 3. 既存のラインを全て削除
        if (existingLineIds.length > 0) {
          const { data: removeData, error: removeError } = await shopifyClient.mutate({
            mutation: REMOVE_FROM_CART,
            variables: { cartId, lineIds: existingLineIds },
          });

          if (removeError) {
            console.error('Remove lines error:', removeError);
            throw new Error(`Failed to remove existing lines: ${removeError.message}`);
          }

          if (removeData.cartLinesRemove.userErrors.length > 0) {
            console.error('Remove user errors:', removeData.cartLinesRemove.userErrors);
            throw new Error(`Failed to remove lines: ${removeData.cartLinesRemove.userErrors.map(e => e.message).join(', ')}`);
          }
        }

        // 4. 新しいラインを追加
        if (lines.length > 0) {
          const { data: addData, error: addError } = await shopifyClient.mutate({
            mutation: ADD_TO_CART,
            variables: { cartId, lines },
          });

          if (addError) {
            console.error('Add lines error:', addError);
            throw new Error(`Failed to add new lines: ${addError.message}`);
          }

          if (addData.cartLinesAdd.userErrors.length > 0) {
            console.error('Add user errors:', addData.cartLinesAdd.userErrors);
            throw new Error(`Failed to add lines: ${addData.cartLinesAdd.userErrors.map(e => e.message).join(', ')}`);
          }

          return NextResponse.json(addData.cartLinesAdd.cart);
        } else {
          // 空のカートの場合は削除後のカートを返す
          const { data: finalCartData, error: finalCartError } = await shopifyClient.query({
            query: GET_CART,
            variables: { cartId },
          });

          if (finalCartError) {
            console.error('Final cart fetch error:', finalCartError);
            throw new Error(`Failed to fetch final cart: ${finalCartError.message}`);
          }

          return NextResponse.json(finalCartData.cart);
        }
      } catch (replaceError) {
        console.error('Replace action error:', replaceError);
        return NextResponse.json(
          { error: 'Failed to replace cart', details: replaceError instanceof Error ? replaceError.message : 'Unknown error' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "add", "remove", or "replace"' },
        { status: 400 }
      );
    }

    const { data, error } = await shopifyClient.mutate({
      mutation,
      variables,
    });

    if (error) {
      console.error('Shopify GraphQL Error:', error);
      return NextResponse.json(
        { error: 'Failed to update cart', details: error.message },
        { status: 500 }
      );
    }

    const mutationResult = action === 'add' ? data.cartLinesAdd : data.cartLinesRemove;

    if (mutationResult.userErrors.length > 0) {
      return NextResponse.json(
        { error: 'Cart update failed', userErrors: mutationResult.userErrors },
        { status: 400 }
      );
    }

    return NextResponse.json(mutationResult.cart);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
