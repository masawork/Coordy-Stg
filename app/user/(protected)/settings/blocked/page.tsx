'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShieldOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBlockedInstructors, unblockInstructor } from '@/lib/api/blocks-client';

export default function BlockedPage() {
  const router = useRouter();
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    loadBlocks();
  }, []);

  const loadBlocks = async () => {
    try {
      setLoading(true);
      const data = await getBlockedInstructors();
      setBlocks(data || []);
    } catch {
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockId: string, name: string) => {
    if (!confirm(`${name}さんのブロックを解除しますか？`)) return;
    setRemovingId(blockId);
    try {
      await unblockInstructor(blockId);
      await loadBlocks();
    } catch {
      alert('ブロック解除に失敗しました');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/user/settings">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ブロック管理</h1>
          <p className="text-sm text-gray-600 mt-1">
            ブロック中の出品者のサービスは検索結果に表示されません
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      ) : blocks.length > 0 ? (
        <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
          {blocks.map((block: any) => (
            <div key={block.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-gray-900">
                  {block.instructor?.user?.name || '出品者'}
                </p>
                {block.reason && (
                  <p className="text-sm text-gray-500 mt-0.5">{block.reason}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(block.createdAt).toLocaleDateString('ja-JP')} にブロック
                </p>
              </div>
              <Button
                onClick={() => handleUnblock(block.id, block.instructor?.user?.name || '出品者')}
                disabled={removingId === block.id}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                解除
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <ShieldOff className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">ブロック中の出品者はいません</p>
        </div>
      )}
    </div>
  );
}
