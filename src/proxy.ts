import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { devBypassRole } from './lib/devBypass';

/**
 * Authentication gate (Next 16 `proxy.ts`, the former middleware).
 * - Browser pages: redirect to /sign-in.
 * - API routes: 401 JSON (never a redirect).
 * - Fails CLOSED: if Clerk keys are missing the app answers 503; it never falls back to "open".
 * Role checks and tenant scoping happen again inside every route handler (defence in depth: this file is
 * Node-runtime middleware, which OpenNext on Cloudflare treats as experimental).
 */
const PUBLIC = [/^\/sign-in(\/.*)?$/, /^\/api\/health$/, /^\/api\/webhooks(\/.*)?$/];

const clerk = clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname;
  if (PUBLIC.some((re) => re.test(path))) return;

  const { userId } = await auth();
  if (userId) return;

  if (path.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return (await auth()).redirectToSignIn({ returnBackUrl: req.url });
});

export default function proxy(req: NextRequest, evt: NextFetchEvent) {
  if (devBypassRole()) return NextResponse.next(); // development test harness only (see lib/devBypass.ts)

  if (!process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    if (PUBLIC.some((re) => re.test(req.nextUrl.pathname)) && req.nextUrl.pathname === '/api/health') return NextResponse.next();
    return NextResponse.json({ error: 'Authentication is not configured' }, { status: 503 });
  }
  return clerk(req, evt);
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
