import { GameShell } from "@/components/game/game-shell";

export default function QuizzesLayout({ children }: { children: React.ReactNode }) {
  return <GameShell>{children}</GameShell>;
}
