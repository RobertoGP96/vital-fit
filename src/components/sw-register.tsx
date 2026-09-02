"use client";

import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sin SW no pasa nada: la app funciona igual, solo no es instalable.
      });
    }
  }, []);
  return null;
}
