// Quaternius "Cute Animated Monsters" (CC0). Each file lives in /public/3d/mascots/<id>.glb.
export const MASCOTS = [
  { id: "Panda", label: "Panda", emoji: "🐼" },
  { id: "Penguin", label: "Pingüino", emoji: "🐧" },
  { id: "Pig", label: "Cerdito", emoji: "🐷" },
  { id: "Yeti", label: "Yeti", emoji: "❄️" },
  { id: "Chicken", label: "Pollito", emoji: "🐤" },
  { id: "Deer", label: "Ciervo", emoji: "🦌" },
  { id: "Ghost", label: "Fantasma", emoji: "👻" },
  { id: "Mushroom", label: "Hongo", emoji: "🍄" },
  { id: "Cactus", label: "Cactus", emoji: "🌵" },
  { id: "Crab", label: "Cangrejo", emoji: "🦀" },
  { id: "Bee", label: "Abeja", emoji: "🐝" },
  { id: "Bat", label: "Murciélago", emoji: "🦇" },
  { id: "Alien", label: "Alien", emoji: "👽" },
  { id: "Alien_Tall", label: "Alien alto", emoji: "🛸" },
  { id: "Cyclops", label: "Cíclope", emoji: "👁️" },
  { id: "Cthulhu", label: "Cthulhu", emoji: "🐙" },
  { id: "Demon", label: "Diablillo", emoji: "😈" },
  { id: "GreenDemon", label: "Diablillo verde", emoji: "👹" },
  { id: "YellowDragon", label: "Dragón", emoji: "🐉" },
  { id: "Skull", label: "Calavera", emoji: "💀" },
  { id: "Tree", label: "Árbol", emoji: "🌳" },
] as const;

export type MascotId = (typeof MASCOTS)[number]["id"];
export type MascotChoice = MascotId | "auto";
