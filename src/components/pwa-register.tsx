"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (window.location.pathname.startsWith("/admin")) return;
    void navigator.serviceWorker.register("/sw.js");
  }, []);
  return null;
}
