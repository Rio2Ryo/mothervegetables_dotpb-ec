import { NextRequest, NextResponse } from 'next/server'
import { shopifyStorefront } from '@/lib/shopify/storefront-client'

const CUSTOMER_QUERY = `
  query getCustomer($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      id
      email
      firstName
      lastName
      phone
      defaultAddress {
        id
        firstName
        lastName
        address1
        address2
        city
        province
        zip
        country
        phone
      }
    }
  }
`

export async function GET(request: NextRequest) {
  try {
    // クッキーからアクセストークンを取得
    const accessToken = request.cookies.get('customerAccessToken')?.value

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    const data = await shopifyStorefront.request(CUSTOMER_QUERY, {
      customerAccessToken: accessToken
    }) as {
      customer: {
        id: string
        email: string
        firstName?: string
        lastName?: string
        phone?: string
        defaultAddress?: {
          id: string
          firstName?: string
          lastName?: string
          address1?: string
          address2?: string
          city?: string
          province?: string
          zip?: string
          country?: string
          phone?: string
        }
      }
    }

    if (!data.customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      address: data.customer.defaultAddress || null,
      customer: {
        email: data.customer.email,
        firstName: data.customer.firstName,
        lastName: data.customer.lastName,
        phone: data.customer.phone
      }
    })

  } catch (error) {
    console.error('Error fetching customer address:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch customer address',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
