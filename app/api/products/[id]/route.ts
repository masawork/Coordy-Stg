import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthInstructor } from '@/lib/api/auth';
import { withErrorHandler, notFoundError, forbiddenError, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 商品詳細取得（公開）
 */
export const GET = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      instructor: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
      images: { orderBy: { sortOrder: 'asc' } },
      reviews: {
        where: { isPublished: true },
        include: { user: { select: { name: true, image: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      _count: { select: { reviews: true, orderItems: true } },
    },
  });

  if (!product) return notFoundError('商品');

  // 平均評価を計算
  const avgRating = await prisma.productReview.aggregate({
    where: { productId: id, isPublished: true },
    _avg: { rating: true },
  });

  return NextResponse.json({
    ...product,
    averageRating: avgRating._avg.rating || 0,
  });
});

/**
 * 商品更新（INSTRUCTOR - オーナーのみ）
 */
export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const authResult = await getAuthInstructor();
  if (authResult instanceof NextResponse) return authResult;
  const { instructor } = authResult;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return notFoundError('商品');
  if (product.instructorId !== instructor.id) return forbiddenError('この商品を編集する権限がありません');

  const body = await request.json();
  const { name, description, category, price, stock, trackStock, sku, weight, shippingFee, status, isActive } = body;

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(price !== undefined && { price }),
      ...(stock !== undefined && { stock }),
      ...(trackStock !== undefined && { trackStock }),
      ...(sku !== undefined && { sku }),
      ...(weight !== undefined && { weight }),
      ...(shippingFee !== undefined && { shippingFee }),
      ...(status !== undefined && { status }),
      ...(isActive !== undefined && { isActive }),
    },
    include: { images: true },
  });

  return NextResponse.json(updated);
});

/**
 * 商品削除（INSTRUCTOR - オーナーのみ）
 */
export const DELETE = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const authResult = await getAuthInstructor();
  if (authResult instanceof NextResponse) return authResult;
  const { instructor } = authResult;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return notFoundError('商品');
  if (product.instructorId !== instructor.id) return forbiddenError('この商品を削除する権限がありません');

  await prisma.product.delete({ where: { id } });

  return NextResponse.json({ success: true });
});
