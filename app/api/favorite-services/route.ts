import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/api/auth';
import { UserRole } from '@prisma/client';
import { withErrorHandler, validationError, conflictError, notFoundError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthUser(UserRole.USER);
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser } = authResult;

  const favorites = await prisma.favoriteService.findMany({
    where: { userId: dbUser.id },
    include: {
      service: {
        include: {
          instructor: { include: { user: true } },
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(favorites);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthUser(UserRole.USER);
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser } = authResult;

  const body = await request.json();
  const { serviceId } = body;

  if (!serviceId) {
    return validationError('サービスIDが必要です');
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });
  if (!service) {
    return notFoundError('サービス');
  }

  const existing = await prisma.favoriteService.findUnique({
    where: {
      userId_serviceId: {
        userId: dbUser.id,
        serviceId,
      },
    },
  });

  if (existing) {
    return conflictError('既にいいね済みです');
  }

  const favorite = await prisma.favoriteService.create({
    data: {
      userId: dbUser.id,
      serviceId,
    },
  });

  return NextResponse.json(favorite, { status: 201 });
});
