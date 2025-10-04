import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 代理店ページのパターン: /[agentCode]/*
  // 除外するパス
  const excludedPaths = [
    '/api',
    '/products',
    '/cart',
    '/checkout',
    '/auth',
    '/login',
    '/register',
    '/admin',
    '/_next',
    '/static',
    '/test',
    '/test-auth',
    '/favicon.ico'
  ];

  // 除外パスの場合は何もしない
  if (excludedPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 静的ファイル（画像、CSS、JS等）をスキップ
  const staticFileExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
    '.css', '.js', '.jsx', '.ts', '.tsx',
    '.json', '.xml', '.txt', '.pdf',
    '.woff', '.woff2', '.ttf', '.eot'
  ];

  if (staticFileExtensions.some(ext => pathname.toLowerCase().endsWith(ext))) {
    return NextResponse.next();
  }

  // URLから代理店コードを抽出
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return NextResponse.next();
  }

  const potentialAgentCode = segments[0];

  // 代理店コードの検証をAPIで行う
  try {
    const apiUrl = new URL('/api/agents', request.url);
    apiUrl.searchParams.set('code', potentialAgentCode);

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    // 代理店が存在しない場合は404ページへリダイレクト
    if (!data.success || !data.agent) {
      console.log(`Invalid agent code: ${potentialAgentCode}`);
      // 404ページへリダイレクト（カスタム404ページを作成することを推奨）
      return NextResponse.rewrite(new URL('/404', request.url));
    }

    // 代理店が存在する場合は続行
    // 代理店コードをCookieに設定
    const nextResponse = NextResponse.next();
    nextResponse.cookies.set('tenant', potentialAgentCode, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7日間
      path: '/',
    });
    
    return nextResponse;
  } catch (error) {
    console.error('Agent validation error:', error);
    // エラーが発生した場合も続行（フォールバック）
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * 代理店ページのみをマッチング対象とする
     * 以下のパスを除外:
     * - /api/* (APIルート)
     * - /_next/* (Next.js内部)
     * - /static/* (静的ファイル)
     * - /favicon.ico, /robots.txt等 (公開ファイル)
     */
    '/((?!api|_next|static|favicon.ico|robots.txt|products|cart|checkout|auth|login|register|admin|test).*)',
  ],
};