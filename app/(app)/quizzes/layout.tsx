import { GameShell } from "@/components/game/game-shell";

export default function QuizzesLayout({ children }: LayoutProps<"/quizzes">) {
  return <GameShell>{children}</GameShell>;
}
