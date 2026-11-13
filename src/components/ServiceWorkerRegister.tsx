"use client";
import { useEffect } from "react";

/** Registers the offline service worker (production builds only). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support unavailable — app still works online */
    });
  }, []);
  return null;
}
