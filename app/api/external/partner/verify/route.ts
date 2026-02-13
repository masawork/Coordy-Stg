/**
 * GET /api/external/partner/verify
 * パートナー認証・URLパラメータ検証
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyPartnerRequest } from '@/lib/partner/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partner_id');
    const ts = searchParams.get('ts');
    const sig = searchParams.get('sig');

    if (!partnerId || !ts || !sig) {
      return NextResponse.json(
        { valid: false, error: 'MISSING_PARAMETERS' },
        { status: 400 },
      );
    }

    const timestamp = parseInt(ts, 10);
    if (isNaN(timestamp)) {
      return NextResponse.json(
        { valid: false, error: 'INVALID_TIMESTAMP' },
        { status: 400 },
      );
    }

    const result = await verifyPartnerRequest(partnerId, timestamp, sig);

    if (!result.valid) {
      return NextResponse.json(result, { status: 401 });
    }

    return NextResponse.json({
      valid: true,
      partner: {
        id: result.partner!.id,
        name: result.partner!.name,
        code: result.partner!.code,
        logoUrl: result.partner!.logoUrl,
        paymentMode: result.partner!.paymentMode,
        allowGuest: result.partner!.allowGuest,
        requirePhone: result.partner!.requirePhone,
      },
      restrictions: {
        instructorIds: result.partner!.instructorIds,
        serviceIds: result.partner!.serviceIds,
      },
    });
  } catch (error: unknown) {
    console.error('Partner verify error:', error);
    return NextResponse.json(
      { valid: false, error: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
