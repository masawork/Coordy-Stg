import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthAdmin, isErrorResponse } from '@/lib/api/auth';
import { withErrorHandler, notFoundError, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const authResult = await getAuthAdmin();
  if (isErrorResponse(authResult)) return authResult;

  const { id } = await params;

  const facility = await prisma.facility.findUnique({
    where: { id },
    include: {
      slots: {
        where: { date: { gte: new Date() } },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        take: 100,
      },
    },
  });

  if (!facility) return notFoundError('施設');

  return NextResponse.json(facility);
});

export const PUT = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const authResult = await getAuthAdmin();
  if (isErrorResponse(authResult)) return authResult;

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.facility.findUnique({ where: { id } });
  if (!existing) return notFoundError('施設');

  const { name, address, prefecture, description, amenities, capacity, hourlyRate, imageUrl, isActive } = body;

  if (name !== undefined && !name?.trim()) return validationError('施設名を入力してください');
  if (address !== undefined && !address?.trim()) return validationError('住所を入力してください');

  const facility = await prisma.facility.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(address !== undefined && { address: address.trim() }),
      ...(prefecture !== undefined && { prefecture: prefecture.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(amenities !== undefined && { amenities }),
      ...(capacity !== undefined && { capacity }),
      ...(hourlyRate !== undefined && { hourlyRate }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json(facility);
});

export const DELETE = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const authResult = await getAuthAdmin();
  if (isErrorResponse(authResult)) return authResult;

  const { id } = await params;

  const existing = await prisma.facility.findUnique({ where: { id } });
  if (!existing) return notFoundError('施設');

  await prisma.facility.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true, message: '施設を無効化しました' });
});
