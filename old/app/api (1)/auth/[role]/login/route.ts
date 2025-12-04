import { NextRequest, NextResponse } from 'next/server';
import { mockUsers, type Role } from '@/lib/mock';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ role: string }> }
) {
  try {
    const { role } = await params;
    const { username, password } = await request.json();

    // Use the same logic as fakeApi.login but for server-side
    const users = mockUsers[role];
    if (!users) {
      return NextResponse.json({ success: false, message: '無効なロールです' }, { status: 400 });
    }

    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
      // Create auth data similar to fakeApi
      const authData = { role, user };

      // Set cookie (using rf_auth to match fakeApi naming)
      const cookieStore = await cookies();
      cookieStore.set('rf_auth', JSON.stringify(authData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });

      return NextResponse.json({
        success: true,
        redirectTo: `/${role}`
      });
    }

    return NextResponse.json({
      success: false,
      message: 'ユーザ名またはパスワードが違います'
    }, { status: 401 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      message: 'ログイン処理中にエラーが発生しました'
    }, { status: 500 });
  }
}