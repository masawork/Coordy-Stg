import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
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
  } catch (error: any) {
    console.error('Instructor profile GET error:', error);
    return NextResponse.json(
      { error: 'インストラクタープロフィールの取得に失敗しました', details: error.message },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
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
      return NextResponse.json({ error: 'インストラクターとして登録されていません' }, { status: 404 });
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
  } catch (error: any) {
    console.error('Instructor profile POST error:', error);
    return NextResponse.json(
      { error: 'インストラクタープロフィールの保存に失敗しました', details: error.message },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
