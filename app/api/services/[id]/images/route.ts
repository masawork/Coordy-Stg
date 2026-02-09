import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

/**
 * POST /api/services/[id]/images
 * サービス画像をアップロード
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serviceId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // サービスの所有者確認
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        instructor: { include: { user: true } },
        images: true,
      },
    });

    if (!service) {
      return NextResponse.json({ error: 'サービスが見つかりません' }, { status: 404 });
    }

    const instructorUser = service.instructor.user;
    if (instructorUser.authId !== user.id && instructorUser.id !== user.id) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    // 画像数上限チェック
    if (service.images.length >= 5) {
      return NextResponse.json({ error: '画像は最大5枚までです' }, { status: 400 });
    }

    // FormDataからファイル取得
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sortOrder = parseInt(formData.get('sortOrder') as string || '0');

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'ファイルサイズは5MB以下にしてください' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'JPEG、PNG、WebPのみ対応しています' }, { status: 400 });
    }

    // Supabase Storageにアップロード
    const ext = file.name.split('.').pop() || 'jpg';
    const storageKey = `${user.id}/${serviceId}/${sortOrder}_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('service-images')
      .upload(storageKey, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: '画像のアップロードに失敗しました', details: uploadError.message },
        { status: 500 }
      );
    }

    // 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('service-images')
      .getPublicUrl(storageKey);

    // DBレコード作成
    const serviceImage = await prisma.serviceImage.create({
      data: {
        serviceId,
        url: publicUrl,
        storageKey,
        sortOrder,
      },
    });

    return NextResponse.json(serviceImage, { status: 201 });
  } catch (error: any) {
    console.error('Upload image error:', error);
    return NextResponse.json(
      { error: '画像のアップロードに失敗しました', details: error?.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * DELETE /api/services/[id]/images
 * サービス画像を削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serviceId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { imageId } = body;

    if (!imageId) {
      return NextResponse.json({ error: 'imageIdが必要です' }, { status: 400 });
    }

    // 画像の所有者確認
    const serviceImage = await prisma.serviceImage.findUnique({
      where: { id: imageId },
      include: {
        service: {
          include: { instructor: { include: { user: true } } },
        },
      },
    });

    if (!serviceImage || serviceImage.serviceId !== serviceId) {
      return NextResponse.json({ error: '画像が見つかりません' }, { status: 404 });
    }

    const instructorUser = serviceImage.service.instructor.user;
    if (instructorUser.authId !== user.id && instructorUser.id !== user.id) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    // Supabase Storageから削除
    await supabase.storage
      .from('service-images')
      .remove([serviceImage.storageKey]);

    // DBから削除
    await prisma.serviceImage.delete({ where: { id: imageId } });

    return NextResponse.json({ success: true, message: '画像を削除しました' });
  } catch (error: any) {
    console.error('Delete image error:', error);
    return NextResponse.json(
      { error: '画像の削除に失敗しました', details: error?.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * PUT /api/services/[id]/images
 * 画像の並び順を更新
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serviceId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // サービスの所有者確認
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { instructor: { include: { user: true } } },
    });

    if (!service) {
      return NextResponse.json({ error: 'サービスが見つかりません' }, { status: 404 });
    }

    const instructorUser = service.instructor.user;
    if (instructorUser.authId !== user.id && instructorUser.id !== user.id) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const body = await request.json();
    const { images } = body as { images: Array<{ id: string; sortOrder: number }> };

    if (!images || !Array.isArray(images)) {
      return NextResponse.json({ error: 'images配列が必要です' }, { status: 400 });
    }

    // 並び順を一括更新
    await Promise.all(
      images.map((img) =>
        prisma.serviceImage.update({
          where: { id: img.id },
          data: { sortOrder: img.sortOrder },
        })
      )
    );

    const updatedImages = await prisma.serviceImage.findMany({
      where: { serviceId },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(updatedImages);
  } catch (error: any) {
    console.error('Reorder images error:', error);
    return NextResponse.json(
      { error: '画像の並び替えに失敗しました', details: error?.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
