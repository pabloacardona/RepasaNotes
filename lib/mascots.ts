import { useSyncExternalStore } from "react";
import { MASCOTS, type MascotChoice, type MascotId } from "./mascot-data";

export { MASCOTS };
export type { MascotChoice, MascotId };

const KEY = "repasa_mascot";
const EVENT = "repasa-mascot";

const isId = (v: string | null): v is MascotId => MASCOTS.some((m) => m.id === v);

// "auto" draws a random mascot once per page load.
let surprise: MascotId | undefined;
function randomMascot(): MascotId {
  surprise ??= MASCOTS[Math.floor(Math.random() * MASCOTS.length)].id;
  return surprise;
}

function read(): MascotChoice {
  try {
    const v = localStorage.getItem(KEY);
    return isId(v) ? v : "auto";
  } catch {
    return "auto";
  }
}

export function setMascot(choice: MascotChoice) {
  try {
    if (choice === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

/** The saved choice ("auto" or an id) and the mascot that should be on screen. */
export function useMascot(): { choice: MascotChoice; id: MascotId } {
  const choice = useSyncExternalStore(subscribe, read, () => "auto" as MascotChoice);
  // The server cannot know the random draw, so it renders Panda and the client swaps after hydrating.
  const id = useSyncExternalStore(
    subscribe,
    () => {
      const c = read();
      return c === "auto" ? randomMascot() : c;
    },
    () => "Panda" as MascotId,
  );
  return { choice, id };
}
