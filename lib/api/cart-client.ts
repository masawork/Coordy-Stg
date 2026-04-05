/**
 * カート関連のAPI操作（クライアント版）
 */

export interface CartProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  trackStock: boolean;
  shippingFee: number;
  images?: Array<{
    url: string;
  }>;
  instructor?: {
    user: {
      name: string;
    };
  };
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: CartProduct;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  shippingTotal: number;
  totalAmount: number;
}

/**
 * カート取得
 */
export async function getCart(): Promise<Cart> {
  try {
    const response = await fetch('/api/cart', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.error || 'カートの取得に失敗しました');
    }

    return await response.json();
  } catch (error: unknown) {
    console.error('Get cart error:', error);
    throw error;
  }
}

/**
 * カートにアイテム追加
 */
export async function addToCart(productId: string, quantity: number = 1): Promise<Cart> {
  try {
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ productId, quantity }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.error || 'カートへの追加に失敗しました');
    }

    return await response.json();
  } catch (error: unknown) {
    console.error('Add to cart error:', error);
    throw error;
  }
}

/**
 * カートアイテム数量更新
 */
export async function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
  try {
    const response = await fetch(`/api/cart/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ quantity }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.error || 'カートの更新に失敗しました');
    }

    return await response.json();
  } catch (error: unknown) {
    console.error('Update cart item error:', error);
    throw error;
  }
}

/**
 * カートアイテム削除
 */
export async function removeCartItem(itemId: string): Promise<void> {
  try {
    const response = await fetch(`/api/cart/${itemId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.error || 'カートからの削除に失敗しました');
    }
  } catch (error: unknown) {
    console.error('Remove cart item error:', error);
    throw error;
  }
}
