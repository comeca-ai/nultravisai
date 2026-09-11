import { NextResponse } from "next/server";
import { gradeHost, normalizeHost } from "@/lib/grade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { domain?: string };
    const host = normalizeHost(body.domain || "");
    const result = await gradeHost(host);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao ler o site.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
