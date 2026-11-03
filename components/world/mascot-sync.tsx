"use client";

import { useEffect } from "react";
import { MASCOTS, setMascot, setMascotPersist, readMascotChoice, type MascotChoice } from "@/lib/mascots";

const save = (choice: MascotChoice) => {
  fetch("/api/mascot", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mascot: choice }) }).catch(() => {});
};

// Ties the mascot choice to the account while logged in: the saved companion wins on every device, and from then
// on every change is stored. A player with no saved companion keeps the one picked on the landing (and it is saved).
export function MascotSync({ saved }: { saved: string | null }) {
  useEffect(() => {
    if (saved && MASCOTS.some((m) => m.id === saved)) setMascot(saved as MascotChoice, { remote: false });
    else {
      const local = readMascotChoice();
      if (local !== "auto") save(local);
    }
    setMascotPersist(save);
    return () => setMascotPersist(null);
  }, [saved]);
  return null;
}
