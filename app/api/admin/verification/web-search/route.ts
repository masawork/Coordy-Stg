/**
 * 管理者用 Web検索API
 * GET /api/admin/verification/web-search?q={query}
 *
 * 本人確認審査時に、申請者の名前等で外部検索を行い
 * 管理者が判断材料として参照できるようにする
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/api/auth';
import { withErrorHandler, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  // 管理者のみ
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.trim().length === 0) {
    return validationError('検索クエリを指定してください');
  }

  try {
    // Google Custom Search API を使用
    // 環境変数が未設定の場合は空の結果を返す
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      // Google Search API未設定の場合は、検索リンクを生成して返す
      const encodedQuery = encodeURIComponent(query);
      return NextResponse.json({
        results: [] as SearchResult[],
        searchLinks: {
          google: `https://www.google.com/search?q=${encodedQuery}`,
          googleNews: `https://news.google.com/search?q=${encodedQuery}`,
        },
        note: 'Google Search APIが未設定のため、外部リンクで検索してください',
      });
    }

    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', searchEngineId);
    url.searchParams.set('q', query);
    url.searchParams.set('num', '5');
    url.searchParams.set('lr', 'lang_ja');

    const response = await fetch(url.toString(), {
      next: { revalidate: 300 }, // 5分キャッシュ
    });

    if (!response.ok) {
      throw new Error(`Google Search API error: ${response.status}`);
    }

    const data = await response.json();

    const results: SearchResult[] = (data.items || []).map(
      (item: { title: string; link: string; snippet: string }) => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
      })
    );

    const encodedQuery = encodeURIComponent(query);
    return NextResponse.json({
      results,
      searchLinks: {
        google: `https://www.google.com/search?q=${encodedQuery}`,
        googleNews: `https://news.google.com/search?q=${encodedQuery}`,
      },
    });
  } catch (error) {
    console.error('Web search error:', error);
    const encodedQuery = encodeURIComponent(query);
    return NextResponse.json({
      results: [] as SearchResult[],
      searchLinks: {
        google: `https://www.google.com/search?q=${encodedQuery}`,
        googleNews: `https://news.google.com/search?q=${encodedQuery}`,
      },
      note: '検索中にエラーが発生しました。外部リンクで検索してください。',
    });
  }
});
