import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthInstructor } from '@/lib/api/auth';
import { withErrorHandler, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 商品一覧取得（公開）
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const instructorId = searchParams.get('instructorId');
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const where: Record<string, unknown> = {
    isActive: true,
    status: 'PUBLISHED',
  };

  if (category) where.category = category;
  if (instructorId) where.instructorId = instructorId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) (where.price as Record<string, number>).gte = parseInt(minPrice);
    if (maxPrice) (where.price as Record<string, number>).lte = parseInt(maxPrice);
  }

  const orderBy: Record<string, string> = {};
  switch (sort) {
    case 'price_asc': orderBy.price = 'asc'; break;
    case 'price_desc': orderBy.price = 'desc'; break;
    case 'popular': orderBy.createdAt = 'desc'; break; // TODO: 売上順
    default: orderBy.createdAt = 'desc';
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        instructor: {
          include: { user: { select: { id: true, name: true, image: true } } },
        },
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        _count: { select: { reviews: true, orderItems: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    products,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

/**
 * 商品作成（INSTRUCTOR）
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthInstructor();
  if (authResult instanceof NextResponse) return authResult;
  const { instructor } = authResult;

  const body = await request.json();
  const { name, description, category, price, stock, trackStock, sku, weight, shippingFee } = body;

  if (!name || !category || price === undefined) {
    return validationError('商品名、カテゴリ、価格は必須です');
  }
  if (price < 0) return validationError('価格は0以上にしてください');

  const product = await prisma.product.create({
    data: {
      instructorId: instructor.id,
      name,
      description: description || null,
      category,
      price,
      stock: stock || 0,
      trackStock: trackStock !== false,
      sku: sku || null,
      weight: weight || null,
      shippingFee: shippingFee || 0,
      status: 'DRAFT',
    },
    include: {
      images: true,
      instructor: { include: { user: { select: { name: true } } } },
    },
  });

  return NextResponse.json(product, { status: 201 });
});
