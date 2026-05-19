import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthInstructor, isErrorResponse } from '@/lib/api/auth';
import { withErrorHandler, validationError } from '@/lib/api/errors';
import { TRANSFER_FEE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async () => {
  const authResult = await getAuthInstructor();
  if (isErrorResponse(authResult)) return authResult;

  const { instructor } = authResult;

  return NextResponse.json({
    payoutFrequency: instructor.payoutFrequency,
    fees: TRANSFER_FEE,
    monthlySchedule: {
      cutoffDay: '月末',
      payoutDay: '翌月15日',
    },
  });
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthInstructor();
  if (isErrorResponse(authResult)) return authResult;

  const { instructor } = authResult;

  const body = await request.json();
  const { payoutFrequency } = body;

  if (!['IMMEDIATE', 'MONTHLY'].includes(payoutFrequency)) {
    return validationError('payoutFrequency は IMMEDIATE または MONTHLY を指定してください');
  }

  const updated = await prisma.instructor.update({
    where: { id: instructor.id },
    data: { payoutFrequency },
  });

  return NextResponse.json({
    payoutFrequency: updated.payoutFrequency,
    message: '振込設定を更新しました',
  });
});
