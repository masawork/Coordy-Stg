/**
 * インストラクター商品詳細API
 * GET /api/instructor/products/[id] - 商品詳細取得
 * PUT /api/instructor/products/[id] - 商品編集
 * DELETE /api/instructor/products/[id] - 商品削除（論理削除）
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthInstructor } from '@/lib/api/auth';
import {
  validationError,
  forbiddenError,
  notFoundError,
  withErrorHandler,
} from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 商品詳細取得（所有者のみ）
 */
export const GET = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const authResult = await getAuthInstructor();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { instructor } = authResult;
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!product) {
    return notFoundError('商品');
  }

  // 権限確認
  if (product.instructorId !== instructor.id) {
    return forbiddenError();
  }

  return NextResponse.json({ product });
});

/**
 * 商品編集（所有者のみ）
 * 部分更新対応
 */
export const PUT = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const authResult = await getAuthInstructor();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { instructor } = authResult;
  const { id } = await params;
  const body = await request.json();

  // 既存商品を確認
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    return notFoundError('商品');
  }

  // 権限確認
  if (product.instructorId !== instructor.id) {
    return forbiddenError();
  }

  // バリデーション（価格の場合）
  const { price, sku, ...rest } = body;

  if (price !== undefined && (typeof price !== 'number' || price < 0)) {
    return validationError('価格は0以上の数値である必要があります');
  }

  // SKU変更時の一意性確認
  if (sku !== undefined && sku !== product.sku) {
    if (sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku },
      });
      if (existingSku) {
        return validationError('このSKUは既に使用されています');
      }
    }
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(price !== undefined && { price }),
      ...(sku !== undefined && { sku: sku || null }),
      ...rest,
    },
    include: {
      images: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  return NextResponse.json({ product: updated });
});

/**
 * 商品削除（論理削除: isActive=false）
 * 所有者のみ削除可能
 */
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const authResult = await getAuthInstructor();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { instructor } = authResult;
  const { id } = await params;

  // 既存商品を確認
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    return notFoundError('商品');
  }

  // 権限確認
  if (product.instructorId !== instructor.id) {
    return forbiddenError();
  }

  // 論理削除
  await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
});
