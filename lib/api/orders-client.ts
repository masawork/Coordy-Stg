/**
 * 注文関連のAPI操作（クライアント版）
 */

export interface OrderProduct {
  name: string;
  images?: Array<{
    url: string;
  }>;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: OrderProduct;
}

export interface ShippingAddress {
  id: string;
  fullName: string;
  phoneNumber: string;
  postalCode: string;
  prefecture: string;
  city: string;
  street: string;
  building?: string;
  isDefault: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  shippingCost: number;
  totalAmount: number;
  paymentMethod: string;
  trackingNumber?: string;
  notes?: string;
  items: OrderItem[];
  shippingAddress?: ShippingAddress;
  createdAt: string;
}

export interface OrdersResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 注文一覧取得
 */
export async function getOrders(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<OrdersResponse> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const response = await fetch(`/api/orders?${searchParams.toString()}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.error || '注文一覧の取得に失敗しました');
    }

    return await response.json();
  } catch (error: unknown) {
    console.error('Get orders error:', error);
    throw error;
  }
}

/**
 * 注文詳細取得
 */
export async function getOrder(id: string): Promise<Order> {
  try {
    const response = await fetch(`/api/orders/${id}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.error || '注文の取得に失敗しました');
    }

    return await response.json();
  } catch (error: unknown) {
    console.error('Get order error:', error);
    throw error;
  }
}

/**
 * 注文作成（カートから）
 */
export async function createOrder(data: {
  paymentMethod: string;
  shippingAddressId: string;
  notes?: string;
}): Promise<Order> {
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.error || '注文の作成に失敗しました');
    }

    return await response.json();
  } catch (error: unknown) {
    console.error('Create order error:', error);
    throw error;
  }
}

/**
 * 注文キャンセル
 */
export async function cancelOrder(id: string): Promise<Order> {
  try {
    const response = await fetch(`/api/orders/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.error || '注文のキャンセルに失敗しました');
    }

    return await response.json();
  } catch (error: unknown) {
    console.error('Cancel order error:', error);
    throw error;
  }
}

/**
 * 配送先住所一覧取得
 */
export async function getShippingAddresses(): Promise<ShippingAddress[]> {
  try {
    const response = await fetch('/api/shipping-addresses', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.error || '配送先住所の取得に失敗しました');
    }

    const data = await response.json();
    return data.addresses || data || [];
  } catch (error: unknown) {
    console.error('Get shipping addresses error:', error);
    throw error;
  }
}

/**
 * 配送先住所作成
 */
export async function createShippingAddress(data: Omit<
  ShippingAddress,
  'id' | 'isDefault'
> & { isDefault?: boolean }): Promise<ShippingAddress> {
  try {
    const response = await fetch('/api/shipping-addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.error || '配送先住所の作成に失敗しました');
    }

    const result = await response.json();
    return result.address || result;
  } catch (error: unknown) {
    console.error('Create shipping address error:', error);
    throw error;
  }
}

/**
 * 配送先住所更新
 */
export async function updateShippingAddress(
  id: string,
  data: Partial<ShippingAddress>
): Promise<ShippingAddress> {
  try {
    const response = await fetch(`/api/shipping-addresses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.error || '配送先住所の更新に失敗しました');
    }

    const result = await response.json();
    return result.address || result;
  } catch (error: unknown) {
    console.error('Update shipping address error:', error);
    throw error;
  }
}

/**
 * 配送先住所削除
 */
export async function deleteShippingAddress(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/shipping-addresses/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.error || '配送先住所の削除に失敗しました');
    }
  } catch (error: unknown) {
    console.error('Delete shipping address error:', error);
    throw error;
  }
}
