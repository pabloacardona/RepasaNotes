import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getQuiz } from "@/lib/data";
import { QuizRunner } from "./quiz-runner";

export const metadata: Metadata = { title: "Resolver quiz" };

export default async function SolveQuizPage({ params }: PageProps<"/quiz/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await requireUser();
  const quiz = await getQuiz(user.sub, id);
  if (!quiz) notFound();
  if (quiz.completedAt) redirect(`/quizzes/${quiz.id}`);

  return (
    <QuizRunner
      id={quiz.id}
      title={quiz.title}
      topic={quiz.topic}
      questions={quiz.questions}
    />
  );
}
