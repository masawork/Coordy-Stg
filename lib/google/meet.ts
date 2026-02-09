/**
 * Google Meet URL生成ヘルパー
 * Google Calendar APIを使用してMeet付きイベントを作成
 */

import { google } from 'googleapis';
import { getAuthenticatedClient, refreshAccessToken } from './oauth';
import prisma from '@/lib/prisma';

interface CreateMeetEventParams {
  instructorId: string;
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendeeEmails?: string[];
}

/**
 * インストラクターのGoogle認証情報を取得・更新
 */
async function getInstructorGoogleAuth(instructorId: string) {
  const instructor = await prisma.instructor.findUnique({
    where: { id: instructorId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleTokenExpiry: true,
    },
  });

  if (!instructor?.googleAccessToken || !instructor?.googleRefreshToken) {
    return null;
  }

  // トークンの有効期限をチェック
  const now = new Date();
  const expiry = instructor.googleTokenExpiry;

  if (expiry && expiry <= now) {
    // トークンを更新
    try {
      const newCredentials = await refreshAccessToken(instructor.googleRefreshToken);

      await prisma.instructor.update({
        where: { id: instructorId },
        data: {
          googleAccessToken: newCredentials.access_token,
          googleTokenExpiry: newCredentials.expiry_date
            ? new Date(newCredentials.expiry_date)
            : null,
        },
      });

      return {
        accessToken: newCredentials.access_token!,
        refreshToken: instructor.googleRefreshToken,
      };
    } catch (error) {
      console.error('Failed to refresh Google token:', error);
      return null;
    }
  }

  return {
    accessToken: instructor.googleAccessToken,
    refreshToken: instructor.googleRefreshToken,
  };
}

/**
 * Google Meet付きカレンダーイベントを作成
 *
 * インストラクターのGoogleアカウントでイベントを作成するため、
 * インストラクターが自動的にMeetのホスト（主催者）になります。
 * ホストは「全員の会議を終了」オプションを使用できます。
 */
export async function createMeetEvent(params: CreateMeetEventParams): Promise<string | null> {
  const { instructorId, summary, description, startTime, endTime, attendeeEmails } = params;

  // インストラクターのGoogle認証情報を取得
  const auth = await getInstructorGoogleAuth(instructorId);

  if (!auth) {
    console.log('Instructor has not connected Google account');
    return null;
  }

  try {
    const oauth2Client = getAuthenticatedClient(auth.accessToken, auth.refreshToken);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // インストラクターのメールアドレスを取得（主催者として明示）
    const instructor = await prisma.instructor.findUnique({
      where: { id: instructorId },
      include: { user: { select: { email: true, name: true } } },
    });

    // Google Meet付きイベントを作成
    // イベント作成者（インストラクター）が自動的にMeetのホストになる
    // ホストが退出しても会議は継続可能（強制終了しない）
    const event = {
      summary,
      description: `${description || ''}\n\n---\n主催者: ${instructor?.user?.name || 'インストラクター'}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
      // 参加者（ユーザー）を追加。インストラクターは主催者として自動追加される
      attendees: attendeeEmails?.map((email) => ({
        email,
        responseStatus: 'accepted',
      })),
      // ゲストの権限を制限（ホストのみが管理）
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: true,
      // Google Meet会議データ
      conferenceData: {
        createRequest: {
          requestId: `coordy-meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
    });

    const meetUrl = response.data.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === 'video'
    )?.uri;

    console.log(`Google Meet created: ${meetUrl} (Host: ${instructor?.user?.email})`);

    return meetUrl || null;
  } catch (error) {
    console.error('Failed to create Google Meet event:', error);
    return null;
  }
}

/**
 * インストラクターがGoogle連携済みかチェック
 */
export async function isGoogleConnected(instructorId: string): Promise<boolean> {
  const instructor = await prisma.instructor.findUnique({
    where: { id: instructorId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
    },
  });

  return !!(instructor?.googleAccessToken && instructor?.googleRefreshToken);
}
