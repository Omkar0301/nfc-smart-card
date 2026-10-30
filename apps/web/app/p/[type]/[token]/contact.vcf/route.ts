import { NextResponse, type NextRequest } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Next.js App Router Route Handler for downloading the contact vCard (.vcf) (F-013).
 * Proxies to the Express API while maintaining strict server-side visibility rules,
 * correct Content-Type (text/vcard), and attachment disposition.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string; token: string }> }
) {
  const { type, token } = await params;

  try {
    const res = await fetch(`${API_URL}/p/${type}/${token}/contact.vcf`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      return NextResponse.json(
        err ?? {
          success: false,
          error: {
            code: 'CONTACT_NOT_FOUND',
            message: 'Unable to retrieve contact card.',
          },
        },
        { status: res.status }
      );
    }

    const vcfContent = await res.text();
    const disposition =
      res.headers.get('content-disposition') || `attachment; filename="${token}.vcf"`;

    return new Response(vcfContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/vcard; charset=utf-8',
        'Content-Disposition': disposition,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Unable to connect to card platform API.',
        },
      },
      { status: 502 }
    );
  }
}
