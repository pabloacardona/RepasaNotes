"use client";

import { useEffect } from "react";
import { MASCOTS, setMascot, setMascotPersist, readMascotChoice, type MascotChoice, type MascotSlot } from "@/lib/mascots";

const save = (choice: MascotChoice, slot: MascotSlot) => {
  fetch("/api/mascot", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mascot: choice, slot }) }).catch(() => {});
};

// Ties both mascot choices to the account while logged in: the saved companions win on every device, and from then
// on every change is stored. A slot with nothing saved keeps the one picked on this device (and it is saved).
export function MascotSync({ saved }: { saved: { main: string | null; baby: string | null } }) {
  const { main, baby } = saved;
  useEffect(() => {
    for (const slot of ["main", "baby"] as const) {
      const value = slot === "main" ? main : baby;
      if (value && MASCOTS.some((m) => m.id === value)) setMascot(value as MascotChoice, { remote: false, slot });
      else {
        const local = readMascotChoice(slot);
        if (local !== "auto") save(local, slot);
      }
    }
    setMascotPersist(save);
    return () => setMascotPersist(null);
  }, [main, baby]);
  return null;
}
