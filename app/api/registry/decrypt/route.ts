import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/encrypt";
import { checkSecret } from "@/lib/admin-auth";
import { readJson } from "@/lib/input";

// Simple guard — requires the same REGISTRY_CLAIM_KEY as a bearer token
// so this endpoint can't be hit by anyone who doesn't already have the key.
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace("Bearer ", "").trim();

  const denied = checkSecret(req, "decrypt", token, process.env.REGISTRY_CLAIM_KEY, "REGISTRY_CLAIM_KEY");
  if (denied) return denied.status === 500 ? NextResponse.json({ error: "Unauthorized" }, { status: 401 }) : denied;

  const parsed = await readJson(req);
  if (parsed.error) return parsed.error;
  const { value } = parsed.body;
  if (!value || typeof value !== "string") {
    return NextResponse.json({ error: "Missing value" }, { status: 400 });
  }

  return NextResponse.json({ decrypted: decrypt(value) });
}
