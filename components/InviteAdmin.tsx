"use client";

import { useState, useMemo, FormEvent } from "react";

interface Invite {
  id: string;
  name: string;
  email: string;
  phone: string;
  revoked: boolean;
  linkSent: string;
  url: string;
}

interface Payload {
  configured: boolean;
  gateOn: boolean;
  invites: Invite[];
}

type BulkState =
  | { step: "idle" }
  | { step: "confirm" }
  | { step: "sending"; count: number }
  | { step: "done"; sent: number; failed: { name: string; error: string }[] }
  | { step: "error"; message: string };

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Private invitation manager: see, copy and email each household's personal link. */
export default function InviteAdmin() {
  const [password, setPassword] = useState("");
  const [data,     setData]     = useState<Payload | null>(null);
  const [state,    setState]    = useState<"idle" | "loading" | "denied" | "error">("idle");
  const [query,    setQuery]    = useState("");
  const [copied,   setCopied]   = useState<string | null>(null);
  const [busy,     setBusy]     = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [bulk,     setBulk]     = useState<BulkState>({ step: "idle" });
  const [notice,   setNotice]   = useState("");

  async function fetchList(): Promise<"ok" | "denied" | "error"> {
    try {
      const res = await fetch("/api/invite/admin", { headers: { "x-admin-password": password } });
      if (res.status === 401) return "denied";
      if (!res.ok) return "error";
      setData(await res.json());
      return "ok";
    } catch {
      return "error";
    }
  }

  async function load(e: FormEvent) {
    e.preventDefault();
    setState("loading");
    const result = await fetchList();
    setState(result === "ok" ? "idle" : result);
  }

  async function post(body: object): Promise<Response> {
    return fetch("/api/invite/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify(body),
    });
  }

  async function copy(inv: Invite) {
    try {
      await navigator.clipboard.writeText(inv.url);
      setCopied(inv.id);
      setTimeout(() => setCopied((c) => (c === inv.id ? null : c)), 2000);
    } catch {
      setRowError((r) => ({ ...r, [inv.id]: "Could not copy — select the link and copy it by hand." }));
    }
  }

  async function sendOne(inv: Invite) {
    setBusy(inv.id);
    setRowError((r) => ({ ...r, [inv.id]: "" }));
    try {
      const res = await post({ action: "send", id: inv.id });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setData((d) =>
          d && { ...d, invites: d.invites.map((i) => (i.id === inv.id ? { ...i, linkSent: json.linkSent } : i)) },
        );
      } else {
        const msg =
          json.error === "send-failed" ? `Email failed: ${json.detail ?? "unknown error"}`
          : json.error === "revoked"    ? "This household is revoked."
          : json.error === "no-email"   ? "No email address on file."
          : "Could not send.";
        setRowError((r) => ({ ...r, [inv.id]: msg }));
      }
    } catch {
      setRowError((r) => ({ ...r, [inv.id]: "Could not send." }));
    }
    setBusy(null);
  }

  async function sendUnsent(count: number) {
    setNotice("");
    setBulk({ step: "sending", count });
    try {
      const res = await post({ action: "send-unsent", expectedCount: count });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409) {
        await fetchList();
        setBulk({ step: "idle" });
        setNotice(`The list changed (now ${json.count} not yet emailed), so nothing was sent. Check the count and try again.`);
        return;
      }
      if (!res.ok) {
        setBulk({ step: "error", message: "Could not send. Some emails may have gone out — refresh to check." });
        return;
      }
      setBulk({ step: "done", sent: json.sent, failed: json.failed ?? [] });
      await fetchList();
    } catch {
      setBulk({ step: "error", message: "Connection lost. Some emails may have gone out — refresh to check." });
    }
  }

  const invites = data?.invites ?? [];
  const unsent = useMemo(() => invites.filter((i) => i.email && !i.revoked && !i.linkSent), [invites]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return invites;
    return invites.filter((i) => [i.name, i.email, i.phone].some((f) => f.toLowerCase().includes(q)));
  }, [invites, query]);

  if (data === null) {
    return (
      <main className="min-h-screen bg-rose-blush flex items-center justify-center px-6">
        <form onSubmit={load} className="w-full max-w-sm bg-white/70 border border-rose-soft/40 p-8 space-y-4">
          <p className="font-serif text-2xl text-bark text-center">Invitations</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full border border-rose-soft/60 bg-white/80 px-4 py-2.5 font-sans text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep"
          />
          {state === "denied" && <p className="text-rose-deep text-sm font-sans text-center">Incorrect password.</p>}
          {state === "error"  && <p className="text-rose-deep text-sm font-sans text-center">Could not load invitations.</p>}
          <button type="submit" disabled={state === "loading" || !password} className="w-full btn-primary disabled:opacity-50">
            {state === "loading" ? "Loading…" : "View"}
          </button>
        </form>
      </main>
    );
  }

  const counts = {
    total:   invites.length,
    email:   invites.filter((i) => i.email).length,
    sent:    invites.filter((i) => i.linkSent).length,
    unsent:  unsent.length,
    revoked: invites.filter((i) => i.revoked).length,
  };

  const chip = (i: Invite) => {
    if (i.revoked)  return { label: "Revoked", cls: "bg-bark/10 text-bark/60" };
    if (i.linkSent) return { label: `Emailed ${fmtDate(i.linkSent)}`, cls: "bg-emerald-100 text-emerald-800" };
    if (!i.email)   return { label: "No email — copy & text it", cls: "bg-amber-100 text-amber-800" };
    return { label: "Not emailed", cls: "bg-rose-soft/30 text-rose-deep" };
  };

  return (
    <main className="min-h-screen bg-rose-blush px-4 sm:px-6 py-12 sm:py-16">
      <div className="max-w-3xl mx-auto">
        <p className="font-serif text-3xl text-bark mb-1">Invitations</p>
        <p className="font-sans text-bark/50 text-sm mb-8">Each household&apos;s personal link to Katie &amp; Jeffrey&apos;s site</p>

        {!data.configured ? (
          <div className="bg-white/60 border border-rose-soft/30 p-5 font-sans text-sm text-bark">
            <p className="font-medium mb-1">Invitations are not set up yet</p>
            <p className="text-bark/60">
              Add <code>INVITE_SECRET</code>, <code>NOTION_INVITES_DATABASE_ID</code> and <code>NOTION_TOKEN</code> to
              the environment (and share the Invitations database with the Notion integration), then reload.
            </p>
          </div>
        ) : (
          <>
            <section className="bg-white/60 border border-rose-soft/30 p-5 mb-6 font-sans text-sm text-bark">
              <p className={`font-medium ${data.gateOn ? "text-emerald-800" : "text-rose-deep"}`}>
                {data.gateOn
                  ? "Gate is ON — only invited guests can enter"
                  : "Gate is OFF — the site is open to anyone with the URL"}
              </p>
              {!data.gateOn && (
                <p className="text-bark/60 mt-1">Set INVITE_GATE=on in Render once you&apos;ve tested your own link.</p>
              )}
              <p className="text-bark/60 mt-3 break-words">
                {counts.total} household{counts.total === 1 ? "" : "s"} · {counts.email} with email · {counts.sent} link
                emailed · {counts.unsent} not yet emailed · {counts.revoked} revoked
              </p>
            </section>

            <div className="mb-6">
              {bulk.step === "idle" && (
                <button
                  type="button"
                  disabled={unsent.length === 0}
                  onClick={() => { setNotice(""); setBulk({ step: "confirm" }); }}
                  className="btn-primary disabled:opacity-50 w-full sm:w-auto"
                >
                  Email everyone not yet emailed ({unsent.length})
                </button>
              )}
              {bulk.step === "confirm" && (
                <div className="bg-white/70 border border-rose-soft/40 p-4 font-sans text-sm text-bark">
                  <p className="mb-3">This will email {unsent.length} household{unsent.length === 1 ? "" : "s"} now. Send?</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => sendUnsent(unsent.length)} className="btn-primary">Confirm</button>
                    <button type="button" onClick={() => setBulk({ step: "idle" })} className="border border-rose-soft/60 bg-white/80 px-4 py-2 text-sm text-bark">Cancel</button>
                  </div>
                </div>
              )}
              {bulk.step === "sending" && (
                <p className="font-sans text-sm text-bark/70" role="status">
                  Sending {bulk.count} email{bulk.count === 1 ? "" : "s"}… this takes about a second each, please keep this page open.
                </p>
              )}
              {bulk.step === "done" && (
                <div className="bg-white/70 border border-rose-soft/40 p-4 font-sans text-sm text-bark" role="status">
                  <p>Sent {bulk.sent} email{bulk.sent === 1 ? "" : "s"}.{bulk.failed.length > 0 && ` ${bulk.failed.length} failed:`}</p>
                  {bulk.failed.length > 0 && (
                    <ul className="mt-2 space-y-1 text-rose-deep">
                      {bulk.failed.map((f, i) => (
                        <li key={`${f.name}-${i}`} className="break-words">{f.name}: {f.error}</li>
                      ))}
                    </ul>
                  )}
                  <button type="button" onClick={() => setBulk({ step: "idle" })} className="mt-3 underline text-bark/60">Dismiss</button>
                </div>
              )}
              {bulk.step === "error" && (
                <div className="font-sans text-sm text-rose-deep">
                  <p>{bulk.message}</p>
                  <button type="button" onClick={() => { fetchList(); setBulk({ step: "idle" }); }} className="mt-2 underline">Refresh</button>
                </div>
              )}
              {notice && <p className="font-sans text-sm text-rose-deep mt-3">{notice}</p>}
            </div>

            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email or phone"
              aria-label="Search households"
              className="w-full border border-rose-soft/60 bg-white/80 px-4 py-2.5 mb-4 font-sans text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep"
            />

            <div className="bg-white/60 border border-rose-soft/30">
              {shown.length === 0 && <p className="font-sans text-sm text-bark/40 p-5">No households match.</p>}
              {shown.map((i) => {
                const c = chip(i);
                return (
                  <div
                    key={i.id}
                    data-testid="invite-row"
                    className={`px-4 sm:px-5 py-4 border-b border-rose-soft/20 last:border-0 ${i.revoked ? "opacity-60" : ""}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-sans text-sm text-bark font-medium break-words">{i.name || "(no name)"}</p>
                        <p className="font-sans text-xs text-bark/50 break-words">
                          {[i.email, i.phone].filter(Boolean).join(" · ") || "No email or phone"}
                        </p>
                      </div>
                      <span className={`self-start shrink-0 font-sans text-xs px-2.5 py-1 ${c.cls}`}>{c.label}</span>
                    </div>

                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                      <code className="flex-1 min-w-0 font-mono text-xs text-bark/70 bg-white/70 border border-rose-soft/30 px-3 py-2 break-all select-all">
                        {i.url}
                      </code>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => copy(i)}
                          className="border border-rose-soft/60 bg-white/80 px-4 py-2 font-sans text-xs text-bark hover:border-rose-deep"
                        >
                          {copied === i.id ? "Copied ✓" : "Copy"}
                        </button>
                        {!i.revoked && i.email && (
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => sendOne(i)}
                            className="border border-rose-deep bg-rose-deep text-white px-4 py-2 font-sans text-xs disabled:opacity-50"
                          >
                            {busy === i.id ? "Sending…" : i.linkSent ? "Email again" : "Email"}
                          </button>
                        )}
                      </div>
                    </div>
                    {rowError[i.id] && <p className="font-sans text-xs text-rose-deep mt-2 break-words">{rowError[i.id]}</p>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
