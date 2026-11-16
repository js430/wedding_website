"use client";

import { useEffect, useState } from "react";

export type InviteStatus = "loading" | "ready" | "none" | "unavailable";

export interface InviteState {
  status: InviteStatus;
  password: string;
  host: string;
  link: string;
}

const LOADING: InviteState = { status: "loading", password: "", host: "", link: "" };

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
      const password = typeof body?.password === "string" ? body.password : "";
      if (!password) return { ...LOADING, status: "none" };
      return {
        status: "ready",
        password,
        host: typeof body?.host === "string" ? body.host : "",
        link: typeof body?.link === "string" ? body.link : "",
      };
    }
    if (res.status === 401) return { ...LOADING, status: "none" };
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
