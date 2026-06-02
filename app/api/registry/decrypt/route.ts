import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/encrypt";

// Simple guard — requires the same REGISTRY_CLAIM_KEY as a bearer token
// so this endpoint can't be hit by anyone who doesn't already have the key.
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace("Bearer ", "").trim();

  if (!process.env.REGISTRY_CLAIM_KEY || token !== process.env.REGISTRY_CLAIM_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { value } = await req.json();
  if (!value || typeof value !== "string") {
    return NextResponse.json({ error: "Missing value" }, { status: 400 });
  }

  return NextResponse.json({ decrypted: decrypt(value) });
}
