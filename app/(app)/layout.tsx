import { AppNav } from "@/components/app-nav";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <>
      <AppNav name={user.name} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </>
  );
}
