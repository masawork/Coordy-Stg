import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import {
  unauthorizedError,
  notFoundError,
  forbiddenError,
  validationError,
  internalError,
} from '@/lib/api/errors';

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
      return unauthorizedError();
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
      return notFoundError('サービス');
    }

    const instructorUser = service.instructor.user;
    if (instructorUser.authId !== user.id && instructorUser.id !== user.id) {
      return forbiddenError();
    }

    // 画像数上限チェック
    if (service.images.length >= 5) {
      return validationError('画像は最大5枚までです');
    }

    // FormDataからファイル取得
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sortOrder = parseInt(formData.get('sortOrder') as string || '0');

    if (!file || file.size === 0) {
      return validationError('ファイルが必要です');
    }

    if (file.size > 5 * 1024 * 1024) {
      return validationError('ファイルサイズは5MB以下にしてください');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return validationError('JPEG、PNG、WebPのみ対応しています');
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
      return internalError('画像のアップロードに失敗しました');
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
  } catch (error: unknown) {
    console.error('Upload image error:', error);
    return internalError('画像のアップロードに失敗しました');
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
      return unauthorizedError();
    }

    const body = await request.json();
    const { imageId } = body;

    if (!imageId) {
      return validationError('imageIdが必要です');
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
      return notFoundError('画像');
    }

    const instructorUser = serviceImage.service.instructor.user;
    if (instructorUser.authId !== user.id && instructorUser.id !== user.id) {
      return forbiddenError();
    }

    // Supabase Storageから削除
    await supabase.storage
      .from('service-images')
      .remove([serviceImage.storageKey]);

    // DBから削除
    await prisma.serviceImage.delete({ where: { id: imageId } });

    return NextResponse.json({ success: true, message: '画像を削除しました' });
  } catch (error: unknown) {
    console.error('Delete image error:', error);
    return internalError('画像の削除に失敗しました');
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
      return unauthorizedError();
    }

    // サービスの所有者確認
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { instructor: { include: { user: true } } },
    });

    if (!service) {
      return notFoundError('サービス');
    }

    const instructorUser = service.instructor.user;
    if (instructorUser.authId !== user.id && instructorUser.id !== user.id) {
      return forbiddenError();
    }

    const body = await request.json();
    const { images } = body as { images: Array<{ id: string; sortOrder: number }> };

    if (!images || !Array.isArray(images)) {
      return validationError('images配列が必要です');
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
  } catch (error: unknown) {
    console.error('Reorder images error:', error);
    return internalError('画像の並び替えに失敗しました');
  }
}
