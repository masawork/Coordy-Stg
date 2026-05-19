import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthAdmin, isErrorResponse } from '@/lib/api/auth';
import { withErrorHandler, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthAdmin();
  if (isErrorResponse(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const prefecture = searchParams.get('prefecture');
  const isActive = searchParams.get('isActive');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

  const where: any = {};
  if (prefecture) where.prefecture = prefecture;
  if (isActive !== null && isActive !== undefined) where.isActive = isActive === 'true';

  const [facilities, total] = await Promise.all([
    prisma.facility.findMany({
      where,
      include: { _count: { select: { slots: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.facility.count({ where }),
  ]);

  return NextResponse.json({
    facilities,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthAdmin();
  if (isErrorResponse(authResult)) return authResult;

  const body = await request.json();
  const { name, address, prefecture, description, amenities, capacity, hourlyRate, imageUrl } = body;

  if (!name?.trim()) return validationError('施設名を入力してください');
  if (!address?.trim()) return validationError('住所を入力してください');
  if (!prefecture?.trim()) return validationError('都道府県を選択してください');

  const facility = await prisma.facility.create({
    data: {
      name: name.trim(),
      address: address.trim(),
      prefecture: prefecture.trim(),
      description: description?.trim() || null,
      amenities: amenities || [],
      capacity: capacity || 1,
      hourlyRate: hourlyRate || null,
      imageUrl: imageUrl || null,
    },
  });

  return NextResponse.json(facility, { status: 201 });
});
