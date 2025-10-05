import { NextRequest, NextResponse } from 'next/server'
import { shopifyStorefront } from '@/lib/shopify/storefront-client'

const GET_CUSTOMER_QUERY = `
  query getCustomer($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      id
      defaultAddress {
        id
      }
      addresses(first: 1) {
        edges {
          node {
            id
          }
        }
      }
    }
  }
`

const UPDATE_EXISTING_ADDRESS_MUTATION = `
  mutation customerAddressUpdate($customerAccessToken: String!, $id: ID!, $address: MailingAddressInput!) {
    customerAddressUpdate(
      customerAccessToken: $customerAccessToken
      id: $id
      address: $address
    ) {
      customerAddress {
        id
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`

const UPDATE_ADDRESS_MUTATION = `
  mutation customerDefaultAddressUpdate($customerAccessToken: String!, $addressId: ID!) {
    customerDefaultAddressUpdate(
      customerAccessToken: $customerAccessToken
      addressId: $addressId
    ) {
      customer {
        id
        defaultAddress {
          id
        }
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`

const CREATE_ADDRESS_MUTATION = `
  mutation customerAddressCreate($customerAccessToken: String!, $address: MailingAddressInput!) {
    customerAddressCreate(
      customerAccessToken: $customerAccessToken
      address: $address
    ) {
      customerAddress {
        id
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address } = body

    // クッキーからアクセストークンを取得
    const customerAccessToken = request.cookies.get('customerAccessToken')?.value

    if (!customerAccessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    // まず顧客情報を取得して既存の住所があるか確認
    console.log('Fetching customer info...')
    const customerResponse = await shopifyStorefront.request(GET_CUSTOMER_QUERY, {
      customerAccessToken
    }) as {
      customer: {
        id: string
        defaultAddress: { id: string } | null
        addresses: {
          edges: Array<{ node: { id: string } }>
        }
      } | null
    }

    const existingAddressId = customerResponse.customer?.defaultAddress?.id ||
                             customerResponse.customer?.addresses?.edges?.[0]?.node?.id

    let finalAddressId: string

    if (existingAddressId) {
      // 既存の住所を更新
      console.log('Updating existing address...', existingAddressId)
      const updateResponse = await shopifyStorefront.request(UPDATE_EXISTING_ADDRESS_MUTATION, {
        customerAccessToken,
        id: existingAddressId,
        address: {
          firstName: address.firstName,
          lastName: address.lastName,
          address1: address.address1,
          address2: address.address2 || '',
          city: address.city,
          province: address.province,
          zip: address.zip,
          country: address.country || 'JP',
          phone: address.phone
        }
      }) as {
        customerAddressUpdate: {
          customerAddress: { id: string } | null
          customerUserErrors: Array<{ code: string; field: string[]; message: string }>
        }
      }

      if (updateResponse.customerAddressUpdate.customerUserErrors.length > 0) {
        console.error('Address update errors:', updateResponse.customerAddressUpdate.customerUserErrors)
        return NextResponse.json(
          {
            success: false,
            message: 'Failed to update address',
            errors: updateResponse.customerAddressUpdate.customerUserErrors
          },
          { status: 400 }
        )
      }

      finalAddressId = updateResponse.customerAddressUpdate.customerAddress?.id || existingAddressId
    } else {
      // 新しい住所を作成
      console.log('Creating new customer address...', address)
      const createResponse = await shopifyStorefront.request(CREATE_ADDRESS_MUTATION, {
        customerAccessToken,
        address: {
          firstName: address.firstName,
          lastName: address.lastName,
          address1: address.address1,
          address2: address.address2 || '',
          city: address.city,
          province: address.province,
          zip: address.zip,
          country: address.country || 'JP',
          phone: address.phone
        }
      }) as {
        customerAddressCreate: {
          customerAddress: { id: string } | null
          customerUserErrors: Array<{ code: string; field: string[]; message: string }>
        }
      }

      if (createResponse.customerAddressCreate.customerUserErrors.length > 0) {
        console.error('Address creation errors:', createResponse.customerAddressCreate.customerUserErrors)
        return NextResponse.json(
          {
            success: false,
            message: 'Failed to create address',
            errors: createResponse.customerAddressCreate.customerUserErrors
          },
          { status: 400 }
        )
      }

      const newAddressId = createResponse.customerAddressCreate.customerAddress?.id

      if (!newAddressId) {
        return NextResponse.json(
          { success: false, message: 'Failed to get new address ID' },
          { status: 500 }
        )
      }

      finalAddressId = newAddressId

      // デフォルト住所として設定
      console.log('Setting as default address...', finalAddressId)
      const setDefaultResponse = await shopifyStorefront.request(UPDATE_ADDRESS_MUTATION, {
        customerAccessToken,
        addressId: finalAddressId
      }) as {
        customerDefaultAddressUpdate: {
          customer: { id: string; defaultAddress: { id: string } } | null
          customerUserErrors: Array<{ code: string; field: string[]; message: string }>
        }
      }

      if (setDefaultResponse.customerDefaultAddressUpdate.customerUserErrors.length > 0) {
        console.error('Default address update errors:', setDefaultResponse.customerDefaultAddressUpdate.customerUserErrors)
        // デフォルト設定の失敗は致命的ではないので警告のみ
        console.warn('Failed to set as default, but address was created')
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Address saved successfully',
      addressId: finalAddressId
    })

  } catch (error) {
    console.error('Error updating customer address:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update address',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
