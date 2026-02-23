import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, unauthorizedError, notFoundError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async () => {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return unauthorizedError();
  }

  // email + role でインストラクターユーザーを検索
  const dbUser = await prisma.user.findUnique({
    where: {
      email_role: {
        email: authUser.email!,
        role: UserRole.INSTRUCTOR,
      },
    },
  });

  if (!dbUser) {
    return NextResponse.json({ instructor: null });
  }

  const instructor = await prisma.instructor.findUnique({
    where: { userId: dbUser.id },
    include: { user: true },
  });

  return NextResponse.json({ instructor });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return unauthorizedError();
  }

  // email + role でインストラクターユーザーを検索
  const dbUser = await prisma.user.findUnique({
    where: {
      email_role: {
        email: authUser.email!,
        role: UserRole.INSTRUCTOR,
      },
    },
  });

  if (!dbUser) {
    return notFoundError('インストラクター');
  }

  const body = await req.json();
  const bio: string | undefined = body.bio ?? undefined;
  const specialties: string[] = Array.isArray(body.specialties)
    ? body.specialties.filter((s: any) => typeof s === 'string' && s.trim().length > 0)
    : [];
  const hourlyRate: number | null =
    typeof body.hourlyRate === 'number'
      ? body.hourlyRate
      : body.hourlyRate
        ? parseInt(body.hourlyRate, 10)
        : null;

  const instructor = await prisma.instructor.upsert({
    where: { userId: dbUser.id },
    update: {
      bio,
      specialties,
      hourlyRate: hourlyRate ?? undefined,
    },
    create: {
      userId: dbUser.id,
      bio,
      specialties,
      hourlyRate: hourlyRate ?? undefined,
      isVerified: false,
    },
    include: { user: true },
  });

  return NextResponse.json({ instructor });
});
