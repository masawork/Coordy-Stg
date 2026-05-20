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

  const blocks = await prisma.blockedInstructor.findMany({
    where: { userId: dbUser.id },
    include: {
      instructor: {
        include: { user: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(blocks);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthUser(UserRole.USER);
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser } = authResult;

  const body = await request.json();
  const { instructorId, reason } = body;

  if (!instructorId) {
    return validationError('出品者IDが必要です');
  }

  const instructor = await prisma.instructor.findUnique({
    where: { id: instructorId },
  });
  if (!instructor) {
    return notFoundError('出品者');
  }

  const existing = await prisma.blockedInstructor.findUnique({
    where: {
      userId_instructorId: {
        userId: dbUser.id,
        instructorId,
      },
    },
  });

  if (existing) {
    return conflictError('既にブロック済みです');
  }

  const block = await prisma.blockedInstructor.create({
    data: {
      userId: dbUser.id,
      instructorId,
      reason: reason || null,
    },
    include: {
      instructor: {
        include: { user: true },
      },
    },
  });

  return NextResponse.json(block, { status: 201 });
});
