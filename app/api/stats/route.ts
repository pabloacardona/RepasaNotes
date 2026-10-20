import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getStats } from "@/lib/data";

export async function GET() {
  const { session, error } = await requireApiUser();
  if (error) return error;
  return NextResponse.json(await getStats(session.sub));
}
