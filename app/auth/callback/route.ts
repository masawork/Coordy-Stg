/**
 * Supabase Auth Callback Handler
 * OAuth・メール確認後のコールバック処理
 *
 * 同じメールアドレスでもロール別に別ユーザーとして管理
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;
  const requestedRole = requestUrl.searchParams.get('role') || 'user';

  console.log('🔐 Auth callback called:', { code: code ? 'present' : 'missing', origin, requestedRole });

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('❌ Exchange code error:', exchangeError);
      return NextResponse.redirect(`${origin}/login/${requestedRole}?error=exchange_failed`);
    }

    // ユーザー情報取得
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('❌ Get user error:', userError);
      return NextResponse.redirect(`${origin}/login/${requestedRole}?error=user_fetch_failed`);
    }

    console.log('✅ User authenticated:', { authId: user.id, email: user.email, requestedRole });

    try {
      const prismaRole = requestedRole.toUpperCase() as 'USER' | 'INSTRUCTOR' | 'ADMIN';

      // ロール別にユーザーを検索（email + role の組み合わせ）
      const existingUser = await prisma.user.findUnique({
        where: {
          email_role: {
            email: user.email!,
            role: prismaRole,
          }
        },
        include: { instructor: true },
      });

      if (existingUser) {
        // 既存ユーザー: そのままログイン
        console.log(`✅ Existing ${requestedRole} found:`, existingUser.id);

        if (!existingUser.authId || existingUser.authId !== user.id) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { authId: user.id },
          });
        }

        // インストラクターの場合、Instructorレコードが無ければ作成
        if (requestedRole === 'instructor' && !existingUser.instructor) {
          await prisma.instructor.create({
            data: {
              userId: existingUser.id,
            },
          });
          console.log(`✅ Instructor record created for existing user:`, existingUser.id);
        }
      } else {
        // 新規ユーザー作成（このロールでは初めて）
        const newUser = await prisma.user.create({
          data: {
            authId: user.id,
            email: user.email!,
            name: user.user_metadata?.name || user.email?.split('@')[0] || '',
            role: prismaRole,
          },
        });
        console.log(`✅ New ${requestedRole} created:`, newUser.id);

        // インストラクターの場合、Instructorレコードも作成
        if (requestedRole === 'instructor') {
          await prisma.instructor.create({
            data: {
              userId: newUser.id,
            },
          });
          console.log(`✅ Instructor record created for:`, newUser.id);
        }
      }

      // ロール別リダイレクト
      if (requestedRole === 'admin') {
        return NextResponse.redirect(`${origin}/manage/admin`);
      } else if (requestedRole === 'instructor') {
        return NextResponse.redirect(`${origin}/instructor`);
      } else {
        return NextResponse.redirect(`${origin}/user`);
      }
    } catch (error) {
      console.error('❌ Callback error:', error);
      return NextResponse.redirect(`${origin}/error?message=callback_error`);
    }
  }

  // エラーの場合はトップページへ
  return NextResponse.redirect(origin);
}
