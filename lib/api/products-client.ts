/**
 * 商品関連のAPI操作（クライアント版）
 */

export interface ProductImage {
  id: string;
  url: string;
  sortOrder: number;
}

export interface ProductInstructor {
  user: {
    name: string;
    image?: string;
  };
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  stock: number;
  trackStock: boolean;
  sku?: string;
  weight?: number;
  shippingFee: number;
  isActive: boolean;
  status: string;
  instructorId: string;
  instructor?: ProductInstructor;
  images?: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductSearchParams {
  q?: string;
  category?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
  page?: number;
  limit?: number;
}

/**
 * 商品一覧取得（公開）
 */
export async function getProducts(params: ProductSearchParams = {}): Promise<ProductsResponse> {
  try {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.category) searchParams.set('category', params.category);
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const response = await fetch(`/api/products?${searchParams.toString()}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.error || '商品一覧の取得に失敗しました');
    }

    return await response.json();
  } catch (error: unknown) {
    console.error('Get products error:', error);
    throw error;
  }
}

/**
 * 商品詳細取得（公開）
 */
export async function getProduct(id: string): Promise<Product> {
  try {
    const response = await fetch(`/api/products/${id}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.error || '商品の取得に失敗しました');
    }

    return await response.json();
  } catch (error: unknown) {
    console.error('Get product error:', error);
    throw error;
  }
}

/**
 * 商品作成（インストラクター）
 */
export async function createProduct(data: {
  name: string;
  description?: string;
  category: string;
  price: number;
  stock?: number;
  trackStock?: boolean;
  sku?: string;
  weight?: number;
  shippingFee?: number;
}): Promise<Product> {
  try {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.error || '商品の作成に失敗しました');
    }

    return await response.json();
  } catch (error: unknown) {
    console.error('Create product error:', error);
    throw error;
  }
}

/**
 * 商品更新（インストラクター）
 */
export async function updateProduct(
  id: string,
  data: Partial<Product>
): Promise<Product> {
  try {
    const response = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.error || '商品の更新に失敗しました');
    }

    return await response.json();
  } catch (error: unknown) {
    console.error('Update product error:', error);
    throw error;
  }
}

/**
 * 商品削除（インストラクター）
 */
export async function deleteProduct(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.error || '商品の削除に失敗しました');
    }
  } catch (error: unknown) {
    console.error('Delete product error:', error);
    throw error;
  }
}

/**
 * インストラクター自身の商品一覧
 */
export async function getInstructorProducts(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<ProductsResponse> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const response = await fetch(`/api/instructor/products?${searchParams.toString()}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || error.error || 'インストラクター商品一覧の取得に失敗しました');
    }

    return await response.json();
  } catch (error: unknown) {
    console.error('Get instructor products error:', error);
    throw error;
  }
}
