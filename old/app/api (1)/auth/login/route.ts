import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { role, username } = await req.json();
  const res = NextResponse.json({ ok: true });

  // 1日有効、モック用
  const opts = { path: '/', maxAge: 60 * 60 * 24, sameSite: 'lax' as const, httpOnly: true };

  res.cookies.set('auth', '1', opts);
  res.cookies.set('role', role, opts);
  // 表示用の名前はクライアントでも読むため httpOnly なし
  res.cookies.set('name', username ?? '', { path: '/', maxAge: 60 * 60 * 24, sameSite: 'lax' });

  return res;
}