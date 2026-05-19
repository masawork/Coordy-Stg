import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, unauthorizedError, validationError, notFoundError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async () => {
  const supabase = await createClient();
  const { data: { user: authUser }, error } = await supabase.auth.getUser();
  if (error || !authUser) return unauthorizedError();

  const dbUser = await prisma.user.findUnique({
    where: { email_role: { email: authUser.email!, role: 'INSTRUCTOR' } },
    include: { instructor: true },
  });

  if (!dbUser?.instructor) return notFoundError('出品者アカウント');

  return NextResponse.json({
    payoutFrequency: dbUser.instructor.payoutFrequency,
    fees: {
      IMMEDIATE: 250,
      MONTHLY: 150,
    },
    monthlySchedule: {
      cutoffDay: '月末',
      payoutDay: '翌月15日',
    },
  });
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user: authUser }, error } = await supabase.auth.getUser();
  if (error || !authUser) return unauthorizedError();

  const dbUser = await prisma.user.findUnique({
    where: { email_role: { email: authUser.email!, role: 'INSTRUCTOR' } },
    include: { instructor: true },
  });

  if (!dbUser?.instructor) return notFoundError('出品者アカウント');

  const body = await request.json();
  const { payoutFrequency } = body;

  if (!['IMMEDIATE', 'MONTHLY'].includes(payoutFrequency)) {
    return validationError('payoutFrequency は IMMEDIATE または MONTHLY を指定してください');
  }

  const updated = await prisma.instructor.update({
    where: { id: dbUser.instructor.id },
    data: { payoutFrequency },
  });

  return NextResponse.json({
    payoutFrequency: updated.payoutFrequency,
    message: '振込設定を更新しました',
  });
});
