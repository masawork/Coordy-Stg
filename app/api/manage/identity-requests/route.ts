import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { getAuthAdmin } from '@/lib/api/auth';
import { withErrorHandler, validationError } from '@/lib/api/errors';

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
export const GET = withErrorHandler(async (req: NextRequest) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(req.url);
  const roleParam = searchParams.get('role');

  if (!roleParam || !['user', 'instructor'].includes(roleParam)) {
    return validationError('role は user | instructor が必須です');
  }

  const role = mapToUserRole(roleParam);
  if (!role) {
    return validationError('無効なロールです');
  }

  // まず、ロールに属する全ユーザーIDを取得
  const users = await prisma.user.findMany({
    where: { role },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

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
});
