"use client";

import { useEffect, useState } from "react";

export type InviteStatus = "loading" | "ready" | "none" | "revoked" | "unavailable";

export interface InviteState {
  status: InviteStatus;
  name: string;
  url: string;
  hasEmail: boolean;
}

const LOADING: InviteState = { status: "loading", name: "", url: "", hasEmail: false };

async function fetchInvite(): Promise<InviteState> {
  try {
    const res = await fetch("/api/invite/me", { cache: "no-store", credentials: "same-origin" });
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (res.status === 200) {
      const url = typeof body?.url === "string" ? body.url : "";
      if (!url) return { ...LOADING, status: "none" };
      return {
        status: "ready",
        name: typeof body?.name === "string" ? body.name : "",
        url,
        hasEmail: Boolean(body?.hasEmail),
      };
    }
    if (res.status === 401) {
      return { ...LOADING, status: body?.error === "revoked" ? "revoked" : "none" };
    }
    return { ...LOADING, status: "unavailable" };
  } catch {
    return { ...LOADING, status: "unavailable" };
  }
}

// One request per page load, shared by every component that asks.
let cached: Promise<InviteState> | null = null;

export function loadInvite(): Promise<InviteState> {
  if (!cached) cached = fetchInvite();
  return cached;
}

export function useInvite(): InviteState {
  const [state, setState] = useState<InviteState>(LOADING);

  useEffect(() => {
    let alive = true;
    loadInvite().then((s) => {
      if (alive) setState(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
