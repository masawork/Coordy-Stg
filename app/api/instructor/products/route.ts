/**
 * インストラクター商品API
 * GET /api/instructor/products - インストラクターの商品一覧取得（ページング対応）
 * POST /api/instructor/products - 商品作成
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthInstructor, getVerifiedInstructor } from '@/lib/api/auth';
import {
  validationError,
  withErrorHandler,
} from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * インストラクターの商品一覧取得
 * ページング対応: page, limit クエリパラメータ
 * 画像数、注文数も含む
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthInstructor();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { instructor } = authResult;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const skip = (page - 1) * limit;

  // 商品取得
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: { instructorId: instructor.id },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        orderItems: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.product.count({
      where: { instructorId: instructor.id },
    }),
  ]);

  // 各商品の注文数を含めたレスポンス
  const productsWithOrderCount = products.map((product) => ({
    ...product,
    imageCount: product.images.length,
    orderCount: product.orderItems.length,
    orderItems: undefined, // 不要なので削除
  }));

  return NextResponse.json({
    products: productsWithOrderCount,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * 商品作成
 * 必須: name, category, price
 * デフォルト: status='DRAFT', stock=0, trackStock=true
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // 本人確認（Level 2）必須
  const authResult = await getVerifiedInstructor();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { instructor } = authResult;
  const body = await request.json();

  // バリデーション
  const { name, description, category, price, stock, trackStock, sku, weight, shippingFee, status } = body;

  if (!name || !category || price === undefined || price === null) {
    return validationError('必須項目が不足しています', {
      name: name ? '' : '必須',
      category: category ? '' : '必須',
      price: price !== undefined && price !== null ? '' : '必須',
    });
  }

  if (typeof price !== 'number' || price < 0) {
    return validationError('価格は0以上の数値である必要があります');
  }

  if (sku) {
    // SKUの一意性確認
    const existingSku = await prisma.product.findUnique({
      where: { sku },
    });
    if (existingSku) {
      return validationError('このSKUは既に使用されています');
    }
  }

  const product = await prisma.product.create({
    data: {
      instructorId: instructor.id,
      name,
      description: description || null,
      category,
      price,
      stock: stock !== undefined && stock !== null ? stock : 0,
      trackStock: trackStock !== undefined ? trackStock : true,
      sku: sku || null,
      weight: weight || null,
      shippingFee: shippingFee || 0,
      status: status || 'DRAFT',
    },
    include: {
      images: true,
    },
  });

  return NextResponse.json({ product }, { status: 201 });
});
