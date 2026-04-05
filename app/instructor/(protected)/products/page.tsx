'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getInstructorProducts, deleteProduct } from '@/lib/api/products-client';
import { Edit2, Trash2, Plus, AlertCircle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  status: string;
  stock: number;
  images?: Array<{ url: string }>;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type ProductStatus = 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';

interface StatusTab {
  id: string;
  label: string;
  status?: ProductStatus;
}

const STATUS_TABS: StatusTab[] = [
  { id: 'all', label: '全て' },
  { id: 'published', label: '公開中', status: 'PUBLISHED' },
  { id: 'draft', label: '下書き', status: 'DRAFT' },
  { id: 'archived', label: 'アーカイブ', status: 'ARCHIVED' },
];

export default function InstructorProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTab, setCurrentTab] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadProducts(currentPage);
  }, [currentTab, currentPage]);

  const loadProducts = async (page: number) => {
    try {
      setLoading(true);
      setError('');

      const selectedTab = STATUS_TABS.find(t => t.id === currentTab);
      const response = await getInstructorProducts({
        page,
        limit: 10,
        status: selectedTab?.status,
      });

      setProducts(response.products || []);
      setPagination(response.pagination);
    } catch (err) {
      console.error('商品一覧取得エラー:', err);
      setError(err instanceof Error ? err.message : '商品一覧の取得に失敗しました');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('この商品を削除しますか？')) return;

    setDeleting(productId);
    try {
      await deleteProduct(productId);
      await loadProducts(currentPage);
    } catch (err) {
      console.error('削除エラー:', err);
      alert(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setDeleting(null);
    }
  };

  const getStatusBadgeColor = (status: ProductStatus): { bg: string; text: string } => {
    const colors: Record<ProductStatus, { bg: string; text: string }> = {
      PUBLISHED: { bg: 'bg-green-100', text: 'text-green-800' },
      DRAFT: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      ARCHIVED: { bg: 'bg-gray-100', text: 'text-gray-800' },
    };
    return colors[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  };

  const getStatusLabel = (status: ProductStatus): string => {
    const labels: Record<ProductStatus, string> = {
      PUBLISHED: '公開中',
      DRAFT: '下書き',
      ARCHIVED: 'アーカイブ',
    };
    return labels[status] || status;
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">商品管理</h1>
          <p className="text-gray-600 mt-1">あなたの商品一覧</p>
        </div>
        <button
          onClick={() => router.push('/instructor/products/new')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
        >
          <Plus className="h-5 w-5" />
          新規商品
        </button>
      </div>

      {/* ステータスフィルタ */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setCurrentTab(tab.id);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              currentTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">エラー</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* ローディング */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Plus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">商品がまだ登録されていません</p>
          <button
            onClick={() => router.push('/instructor/products/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus className="h-5 w-5" />
            最初の商品を作成
          </button>
        </div>
      ) : (
        <>
          {/* 商品テーブル */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">商品名</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">価格</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">在庫</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ステータス</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">アクション</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => {
                  const statusColor = getStatusBadgeColor(product.status as ProductStatus);

                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {product.images?.[0]?.url && (
                            <img
                              src={product.images[0].url}
                              alt={product.name}
                              className="h-10 w-10 object-cover rounded bg-gray-100"
                            />
                          )}
                          <p className="font-medium text-gray-900">{product.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ¥{product.price.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {product.stock}個
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColor.bg} ${statusColor.text}`}>
                          {getStatusLabel(product.status as ProductStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/instructor/products/${product.id}/edit`)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            disabled={deleting === product.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            {deleting === product.id ? '削除中...' : '削除'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                前へ
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-purple-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                disabled={currentPage === pagination.totalPages}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                次へ
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
