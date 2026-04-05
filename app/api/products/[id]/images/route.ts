import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

/**
 * POST /api/products/[id]/images
 * 商品画像をアップロード
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 商品の所有者確認
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        instructor: { include: { user: true } },
        images: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: '商品が見つかりません' }, { status: 404 });
    }

    const instructorUser = product.instructor.user;
    if (instructorUser.authId !== user.id && instructorUser.id !== user.id) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    // 画像数上限チェック
    if (product.images.length >= 5) {
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
    const storageKey = `${user.id}/${productId}/${sortOrder}_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('product-images')
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
      .from('product-images')
      .getPublicUrl(storageKey);

    // DBレコード作成
    const productImage = await prisma.productImage.create({
      data: {
        productId,
        url: publicUrl,
        storageKey,
        sortOrder,
      },
    });

    return NextResponse.json(productImage, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Upload product image error:', error);
    return NextResponse.json(
      { error: '画像のアップロードに失敗しました', details: message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * DELETE /api/products/[id]/images
 * 商品画像を削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;

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
    const productImage = await prisma.productImage.findUnique({
      where: { id: imageId },
      include: {
        product: {
          include: { instructor: { include: { user: true } } },
        },
      },
    });

    if (!productImage || productImage.productId !== productId) {
      return NextResponse.json({ error: '画像が見つかりません' }, { status: 404 });
    }

    const instructorUser = productImage.product.instructor.user;
    if (instructorUser.authId !== user.id && instructorUser.id !== user.id) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    // Supabase Storageから削除
    await supabase.storage
      .from('product-images')
      .remove([productImage.storageKey]);

    // DBから削除
    await prisma.productImage.delete({ where: { id: imageId } });

    return NextResponse.json({ success: true, message: '画像を削除しました' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Delete product image error:', error);
    return NextResponse.json(
      { error: '画像の削除に失敗しました', details: message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * PUT /api/products/[id]/images
 * 画像の並び順を更新
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 商品の所有者確認
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { instructor: { include: { user: true } } },
    });

    if (!product) {
      return NextResponse.json({ error: '商品が見つかりません' }, { status: 404 });
    }

    const instructorUser = product.instructor.user;
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
        prisma.productImage.update({
          where: { id: img.id },
          data: { sortOrder: img.sortOrder },
        })
      )
    );

    const updatedImages = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(updatedImages);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Reorder product images error:', error);
    return NextResponse.json(
      { error: '画像の並び替えに失敗しました', details: message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
