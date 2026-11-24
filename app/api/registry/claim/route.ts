import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { Resend } from "resend";
import { encrypt } from "@/lib/encrypt";
import { SHIPPING_LINES } from "@/lib/shipping";
import { cleanEmail, cleanText, escapeHtml, readJson, withLock } from "@/lib/input";
import { allow } from "@/lib/rate-limit";
import { clientKey } from "@/lib/invite-guard";
import { bought, remaining, wanted, type RegistryItem } from "@/lib/registry";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
// Constructed per request: `new Resend()` throws when the key is absent, which
// would otherwise fail `next build` on any machine without the secret.
function resendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

/** A registry row as loaded from Notion: the only source the email trusts. */
interface ClaimItem extends RegistryItem {
  /** Existing ClaimedBy text, kept when more guests claim the same row. */
  claimedBy: string;
  /** How many this guest is claiming (set on the requested rows only). */
  qty: number;
}

/** An http(s) URL safe to put in an href, or "" for anything else. */
function safeLink(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function buildEmail(guestName: string, items: ClaimItem[]): string {
  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #FFB3C4;">
          <p style="margin:0;font-family:Georgia,serif;font-size:16px;color:#1E0008;">
            ${escapeHtml(item.name)}${item.option ? ` <span style="font-family:sans-serif;font-size:13px;color:#8B0010;">(${escapeHtml(item.option)})</span>` : ""}
          </p>
          ${item.qty > 1 ? `<p style="margin:2px 0 0;font-family:sans-serif;font-size:13px;color:#1E0008;">Quantity: <strong>${item.qty}</strong></p>` : ""}
          ${item.variant ? `<p style="margin:2px 0 0;font-family:sans-serif;font-size:12px;color:#8B0010;">Preferred: ${escapeHtml(item.variant)}</p>` : ""}
          ${item.price ? `<p style="margin:4px 0 0;font-family:sans-serif;font-size:13px;color:#8B0010;">$${item.price.toFixed(2)} <span style="font-size:10px;letter-spacing:0.1em;color:#8B6B5C;">MSRP</span></p>` : ""}
        </td>
        <td style="padding:12px 0 12px 16px;border-bottom:1px solid #FFB3C4;text-align:right;white-space:nowrap;">
          ${
            item.link
              ? `<a href="${escapeHtml(item.link)}" style="background:#CC1428;color:#FEE8EC;font-family:sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;text-decoration:none;padding:8px 16px;display:inline-block;">View Item</a>`
              : ""
          }
        </td>
      </tr>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#FEE8EC;font-family:sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FEE8EC;padding:40px 20px;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;max-width:560px;width:100%;">

            <!-- Header -->
            <tr>
              <td style="background:#1E0008;padding:32px;text-align:center;">
                <p style="margin:0;font-family:Georgia,serif;font-style:italic;color:#c9a838;font-size:13px;letter-spacing:0.2em;">
                  Katie &amp; Jeffrey
                </p>
                <h1 style="margin:8px 0 0;font-family:Georgia,serif;color:#FEE8EC;font-size:28px;font-weight:normal;">
                  Your Registry Picks
                </h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 8px;font-family:Georgia,serif;font-size:18px;color:#1E0008;">
                  Hi ${escapeHtml(guestName)},
                </p>
                <p style="margin:0 0 24px;font-family:sans-serif;font-size:14px;color:#4a3728;line-height:1.6;">
                  Here are the items you saved from our registry. Each link will take you
                  directly to the retailer to complete your purchase. Thank you so much!
                </p>
                <p style="margin:-12px 0 24px;font-family:sans-serif;font-size:13px;color:#4a3728;line-height:1.6;">
                  The prices listed are the retail price (MSRP), just for reference. Feel free
                  to buy from anywhere you like. If you find a gift for less elsewhere, please do!
                </p>

                <table width="100%" cellpadding="0" cellspacing="0">
                  ${itemRows}
                </table>

                <!-- Shipping address -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0;background:#FEE8EC;border:1px solid #FFB3C4;">
                  <tr>
                    <td style="padding:20px 24px;">
                      <p style="margin:0 0 10px;font-family:sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8B0010;">
                        Ship gifts to
                      </p>
                      <p style="margin:0;font-family:Georgia,serif;font-size:16px;line-height:1.55;color:#1E0008;">
                        ${SHIPPING_LINES.join('<br />')}
                      </p>
                      <p style="margin:12px 0 0;font-family:sans-serif;font-size:12px;line-height:1.5;color:#4a3728;">
                        Enter this as the delivery address at checkout. Most retailers
                        ask for it on the shipping step, before payment.
                      </p>
                    </td>
                  </tr>
                </table>

                <p style="margin:28px 0 0;font-family:sans-serif;font-size:13px;color:#8B0010;text-align:center;">
                  If you have any questions, don't hesitate to reach out.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#FEE8EC;padding:20px;text-align:center;">
                <p style="margin:0;font-family:sans-serif;font-size:12px;color:#8B0010;">
                  Katie &amp; Jeffrey · March 27, 2027 · Charlottesville, VA
                </p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

const MAX_ITEMS = 25;
const MAX_QTY = 20;
const COUNT = "Quantity Claimed";

const plainId = (id: string) => id.replace(/-/g, "").toLowerCase();
const isNotionId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{32}$/.test(plainId(v));

function toItem(page: any): ClaimItem {
  const p = page.properties ?? {};
  return {
    id:           page.id,
    name:         p.Name?.title?.[0]?.plain_text ?? "",
    description:  "",
    imageUrl:     "",
    category:     "",
    option:       p.Option?.rich_text?.[0]?.plain_text ?? "",
    price:        p.Price?.number ?? null,
    link:         safeLink(p.Link?.url ?? ""),
    variant:      p.Variant?.rich_text?.[0]?.plain_text ?? "",
    group:        (p.Group?.rich_text?.[0]?.plain_text ?? "").trim(),
    multiple:     p["Allow Multiple"]?.checkbox === true,
    claimed:      p.Claimed?.checkbox === true,
    quantity:     p.Quantity?.number ?? 1,
    claimedCount: typeof p[COUNT]?.number === "number" ? p[COUNT].number : null,
    claimedBy:    (p.ClaimedBy?.rich_text ?? []).map((t: any) => t.plain_text ?? "").join(""),
    qty:          0,
  };
}

/** The claim state of a row: what we write, and what we restore on rollback. */
interface RowState { claimed: boolean; count: number | null; by: string }

let countColumnMissing = false;

/**
 * Write a row's claim state. If the database has no "Quantity Claimed"
 * column yet, fall back to the old all-or-nothing behaviour for that row.
 */
async function writeRow(pageId: string, state: RowState, fullyIfNoCount: boolean) {
  const base: Record<string, any> = {
    Claimed:   { checkbox: state.claimed },
    ClaimedBy: { rich_text: state.by ? [{ text: { content: state.by.slice(0, 2000) } }] : [] },
  };
  if (!countColumnMissing) {
    try {
      await notion.pages.update({ page_id: pageId, properties: { ...base, [COUNT]: { number: state.count } } });
      return;
    } catch (err: any) {
      if (!String(err?.message ?? "").includes(COUNT)) throw err;
      countColumnMissing = true;
      console.warn(`[Registry] No "${COUNT}" number column; quantities above 1 close after the first claim. Add the column to use them.`);
    }
  }
  await notion.pages.update({
    page_id: pageId,
    properties: { ...base, Claimed: { checkbox: fullyIfNoCount ? true : state.claimed } },
  });
}

/**
 * Claim gifts and email the guest their purchase links.
 *
 * The browser sends only row ids and how many of each; names, prices and
 * links in the email come from Notion. Claims run one at a time (withLock),
 * so two guests can't both pass the availability check for the same gift, and
 * if the email can't be sent every row is put back as it was.
 */
export async function POST(req: NextRequest) {
  const parsed = await readJson(req);
  if (parsed.error) return parsed.error;
  const body = parsed.body;

  const guestName = cleanText(body.guestName, 120);
  const email     = cleanEmail(body.email);
  const wantedQty = new Map<string, number>();
  if (Array.isArray(body.items)) {
    for (const entry of body.items as any[]) {
      const id = typeof entry === "string" ? entry : entry?.id;
      if (!isNotionId(id)) continue;
      const raw = typeof entry === "object" && entry !== null ? Number(entry.qty ?? 1) : 1;
      const qty = Number.isInteger(raw) && raw >= 1 && raw <= MAX_QTY ? raw : NaN;
      if (Number.isNaN(qty)) return NextResponse.json({ error: "items-invalid" }, { status: 400 });
      const key = plainId(id);
      wantedQty.set(key, Math.min(MAX_QTY, (wantedQty.get(key) ?? 0) + qty));
    }
  }
  const ids = Array.from(wantedQty.keys());

  if (!guestName) return NextResponse.json({ error: "name-required" }, { status: 400 });
  if (!email)     return NextResponse.json({ error: "email-invalid" }, { status: 400 });
  if (!ids.length || ids.length > MAX_ITEMS) {
    return NextResponse.json({ error: "items-invalid" }, { status: 400 });
  }
  if (!allow(`claim-ip:${clientKey(req)}`, 20, 60 * 60 * 1000) || !allow(`claim-email:${email}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  const databaseId = process.env.NOTION_REGISTRY_DATABASE_ID;
  if (!databaseId || !process.env.RESEND_API_KEY) {
    console.error("[Registry] NOTION_REGISTRY_DATABASE_ID or RESEND_API_KEY is not set");
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  return withLock("registry-claim", async () => {
    // ── Load the requested rows and their sibling options, fresh ─────────────
    let items: ClaimItem[];
    const siblings = new Map<string, ClaimItem[]>();
    try {
      const pages = await Promise.all(ids.map((id) => notion.pages.retrieve({ page_id: id })));
      if (pages.some((page: any) => plainId(page.parent?.database_id ?? "") !== plainId(databaseId))) {
        return NextResponse.json({ error: "items-invalid" }, { status: 400 });
      }
      items = pages.map((page) => {
        const item = toItem(page);
        item.qty = wantedQty.get(plainId(item.id)) ?? 1;
        return item;
      });

      const groups = Array.from(new Set(items.map((i) => i.group).filter(Boolean)));
      await Promise.all(groups.map(async (group) => {
        const res = await notion.databases.query({
          database_id: databaseId,
          filter: { property: "Group", rich_text: { equals: group } },
        });
        siblings.set(group, res.results.map(toItem));
      }));
    } catch (err: any) {
      if (err?.code === "object_not_found" || err?.code === "validation_error") {
        return NextResponse.json({ error: "items-invalid" }, { status: 400 });
      }
      console.error("[Registry] Loading items failed:", err?.message ?? err);
      return NextResponse.json({ error: "unavailable" }, { status: 502 });
    }

    // A group "allows multiple" when any of its rows has the box ticked; then
    // each option is claimed on its own. Otherwise it's one-of: once an option
    // has been bought, only that option can be bought (up to its quantity).
    const groupOf = (i: ClaimItem) => (i.group ? siblings.get(i.group) ?? [i] : [i]);
    const oneOf = (i: ClaimItem) => i.group !== "" && groupOf(i).length > 1 && !groupOf(i).some((s) => s.multiple);
    const lockedTo = (i: ClaimItem) => (oneOf(i) ? groupOf(i).find((s) => bought(s) > 0) ?? null : null);

    // ── Refuse anything already taken (or not enough left) ──────────────────
    const taken = items.filter((i) => {
      const lock = lockedTo(i);
      return remaining(i) < i.qty || (lock !== null && plainId(lock.id) !== plainId(i.id));
    });
    if (taken.length) {
      return NextResponse.json(
        { error: "already-claimed", items: taken.map((i) => i.name), ids: taken.map((i) => i.id) },
        { status: 409 },
      );
    }
    // Two options of the same one-of gift in a single request: the page never
    // sends this, so treat it as a bad request rather than guess.
    const oneOfGroups = items.filter(oneOf).map((i) => i.group);
    if (new Set(oneOfGroups).size !== oneOfGroups.length) {
      return NextResponse.json({ error: "items-invalid" }, { status: 400 });
    }

    // ── Plan the writes ─────────────────────────────────────────────────────
    const claimedBy = encrypt(`${guestName} (${email})`);
    const before = new Map<string, RowState>();
    const after  = new Map<string, { state: RowState; fullyIfNoCount: boolean }>();
    for (const i of items) {
      const count = (i.claimedCount ?? 0) + i.qty;
      before.set(i.id, { claimed: i.claimed, count: i.claimedCount ?? null, by: i.claimedBy });
      after.set(i.id, {
        state: { claimed: count >= wanted(i), count, by: i.claimedBy ? `${i.claimedBy}\n${claimedBy}` : claimedBy },
        fullyIfNoCount: true,
      });
      // One-of: the other options close (count 0: closed, not bought).
      if (oneOf(i)) {
        for (const s of groupOf(i)) {
          if (plainId(s.id) === plainId(i.id) || (s.claimed && s.claimedCount === 0)) continue;
          before.set(s.id, { claimed: s.claimed, count: s.claimedCount ?? null, by: s.claimedBy });
          after.set(s.id, { state: { claimed: true, count: 0, by: s.claimedBy }, fullyIfNoCount: true });
        }
      }
    }

    const rowIds = Array.from(after.keys());
    const restore = async (pageIds: string[]) => {
      const results = await Promise.allSettled(
        pageIds.map((id) => writeRow(id, before.get(id)!, false)),
      );
      results.forEach((r, n) => {
        if (r.status === "rejected") console.error("[Registry] Could not restore", pageIds[n], (r as any).reason?.message);
      });
    };

    const writes = await Promise.allSettled(rowIds.map((id) => writeRow(id, after.get(id)!.state, after.get(id)!.fullyIfNoCount)));
    if (writes.some((w) => w.status === "rejected")) {
      console.error("[Registry] Claim write failed; restoring", writes.filter((w) => w.status === "rejected").map((w: any) => w.reason?.message));
      await restore(rowIds.filter((_, n) => writes[n].status === "fulfilled"));
      return NextResponse.json({ error: "unavailable" }, { status: 502 });
    }

    // ── Email the purchase links; undo the claim if that fails ──────────────
    const fromAddress = process.env.REGISTRY_FROM_EMAIL ?? "Katie & Jeffrey <onboarding@resend.dev>";
    let sent = false;
    try {
      const { error } = await resendClient().emails.send({
        from:    fromAddress,
        to:      email,
        subject: "Your picks from Katie & Jeffrey's Registry 💍",
        html:    buildEmail(guestName, items),
      });
      if (error) console.error("[Registry] Email error:", error);
      else sent = true;
    } catch (err: any) {
      console.error("[Registry] Email error:", err?.message ?? err);
    }
    if (!sent) {
      await restore(rowIds);
      return NextResponse.json({ error: "email-failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  });
}
