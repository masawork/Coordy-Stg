import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Clear the auth cookie (matching fakeApi.logout behavior)
    const res = NextResponse.json({ success: true });
    const del = { path: '/', maxAge: 0 };
    res.cookies.set('rf_auth', '', del);
    return res;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({
      success: false,
      message: 'ログアウト処理中にエラーが発生しました'
    }, { status: 500 });
  }
}