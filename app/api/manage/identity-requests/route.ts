import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// roleパラメータをUserRole enumにマッピング
function mapToUserRole(roleParam: string): UserRole | null {
  switch (roleParam) {
    case 'user':
      return UserRole.USER;
    case 'instructor':
      return UserRole.INSTRUCTOR;
    case 'admin':
      return UserRole.ADMIN;
    default:
      return null;
  }
}

/**
 * GET /api/manage/identity-requests?role=user|instructor
 * ユーザー/インストラクターの本人確認申請をロールごとに返す
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roleParam = searchParams.get('role');

    if (!roleParam || !['user', 'instructor'].includes(roleParam)) {
      return NextResponse.json({ error: 'role は user | instructor が必須です' }, { status: 400 });
    }

    const role = mapToUserRole(roleParam);
    if (!role) {
      return NextResponse.json({ error: '無効なロールです' }, { status: 400 });
    }

    console.log(`[identity-requests] Fetching requests for role: ${roleParam} (enum: ${role})`);

    // まず、ロールに属する全ユーザーIDを取得
    const users = await prisma.user.findMany({
      where: { role },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    console.log(`[identity-requests] Found ${users.length} users with role ${roleParam}`);

    const userIds = users.map((u) => u.id);

    // 申請一覧（ユーザーを紐付け）
    const requests = await prisma.identityVerificationRequest.findMany({
      where: {
        userId: {
          in: userIds,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`[identity-requests] Found ${requests.length} verification requests`);

    const pending = requests.filter((r) => r.status === 'pending');
    const approved = requests.filter((r) => r.status === 'approved');
    const rejected = requests.filter((r) => r.status === 'rejected');

    // 未提出= 該当ロールのユーザーでリクエストが一件も無い
    const requestUserIds = new Set(requests.map((r) => r.userId));
    const notSubmitted = users.filter((u) => !requestUserIds.has(u.id));

    return NextResponse.json({
      role: roleParam, // 元のパラメータを返す（小文字）
      counts: {
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
        notSubmitted: notSubmitted.length,
        totalUsers: users.length,
      },
      requests,
    });
  } catch (error: any) {
    console.error('Get identity requests error:', error);
    console.error('Error code:', error.code);
    console.error('Error meta:', error.meta);
    console.error('Error stack:', error.stack);
    return NextResponse.json({
      error: '本人確認データの取得に失敗しました',
      details: error.message,
      code: error.code,
    }, { status: 500 });
  }
}
