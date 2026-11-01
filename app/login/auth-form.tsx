"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, FieldMessage, Spinner, inputClass } from "@/components/ui";
import { loginSchema, registerSchema } from "@/lib/validators";

type Mode = "login" | "register";
type Fields = { name: string; email: string; password: string };

export function AuthForm({ initial }: { initial: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initial);
  const [values, setValues] = useState<Fields>({ name: "", email: "", password: "" });
  const [touched, setTouched] = useState<Partial<Record<keyof Fields, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const schema = mode === "register" ? registerSchema : loginSchema;
  const result = schema.safeParse(values);
  const clientErrors: Record<string, string> = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const k = String(issue.path[0]);
      if (!clientErrors[k]) clientErrors[k] = issue.message;
    }
  }

  function fieldState(k: keyof Fields) {
    const err = serverErrors[k] ?? (touched[k] ? clientErrors[k] : undefined);
    const ok = touched[k] && !err && values[k] ? true : false;
    return { err, ok };
  }

  function set(k: keyof Fields, v: string) {
    setValues((s) => ({ ...s, [k]: v }));
    setServerErrors((s) => {
      const next = { ...s };
      delete next[k];
      delete next.form;
      return next;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });
    if (!result.success) return;
    setLoading(true);
    setServerErrors({});
    try {
      const res = await fetch(`/api/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerErrors(data.errors ?? { form: "Algo salió mal" });
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setServerErrors({ form: "Sin conexión. Intenta de nuevo." });
    } finally {
      setLoading(false);
    }
  }

  function switchMode(m: Mode) {
    setMode(m);
    setTouched({});
    setServerErrors({});
  }

  const email = fieldState("email");
  const password = fieldState("password");
  const name = fieldState("name");

  return (
    <>
      <div role="tablist" className="grid grid-cols-2 overflow-hidden rounded-lg border-2 border-line">
        {(["login", "register"] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={`py-2.5 font-bold transition ${
              mode === m ? "border-[var(--line-strong)] bg-[var(--accent)] text-[var(--on-accent)] shadow-[2px_2px_0_var(--line-strong)]" : "bg-card text-ink-soft hover:text-ink"
            }`}
          >
            {m === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        {mode === "register" && (
          <div>
            <label htmlFor="name" className="mb-1.5 block font-bold">Nombre</label>
            <input
              id="name"
              autoComplete="name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              className={inputClass(name.err ? "error" : name.ok ? "ok" : undefined)}
              placeholder="Laura Gómez"
              aria-invalid={!!name.err}
            />
            <FieldMessage error={name.err} />
          </div>
        )}
        <div>
          <label htmlFor="email" className="mb-1.5 block font-bold">Correo</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            className={inputClass(email.err ? "error" : email.ok ? "ok" : undefined)}
            placeholder="laura@correo.com"
            aria-invalid={!!email.err}
          />
          <FieldMessage error={email.err} />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block font-bold">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            value={values.password}
            onChange={(e) => set("password", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            className={inputClass(password.err ? "error" : password.ok ? "ok" : undefined)}
            placeholder="••••••••"
            aria-invalid={!!password.err}
          />
          <FieldMessage
            error={password.err}
            ok={mode === "register" && password.ok ? "Mínimo 8 caracteres" : undefined}
          />
        </div>

        {serverErrors.form && (
          <p role="alert" className="rounded-lg bg-red-soft px-3 py-2 font-bold text-red">
            {serverErrors.form}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full py-3">
          {loading && <Spinner />}
          {mode === "register" ? "Crear cuenta" : "Iniciar sesión"}
        </Button>
      </form>
    </>
  );
}
