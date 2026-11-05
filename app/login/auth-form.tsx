"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, FieldMessage, Spinner, inputClass } from "@/components/ui";
import { loginSchema, registerSchema } from "@/lib/validators";
import { firebaseAuth, firebaseEnabled } from "@/lib/firebase-client";

// Firebase error codes -> messages a player understands.
function firebaseMessage(err: unknown) {
  const code = (err as { code?: string })?.code ?? "";
  if (code === "auth/email-already-in-use") return "Ya existe una cuenta con este correo";
  if (code === "auth/weak-password") return "La contraseña es demasiado débil (mínimo 8 caracteres)";
  if (code === "auth/too-many-requests") return "Demasiados intentos. Espera unos minutos.";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "";
  if (code === "auth/popup-blocked") return "El navegador bloqueó la ventana de Google. Permite las ventanas emergentes.";
  if (code === "auth/network-request-failed") return "Sin conexión. Intenta de nuevo.";
  return "No se pudo iniciar sesión. Intenta de nuevo.";
}

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

  // Trades a signed-in Firebase user for the app session cookie.
  async function exchange(user: { getIdToken: () => Promise<string> }, name?: string) {
    const res = await fetch("/api/auth/firebase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: await user.getIdToken(), name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "No se pudo iniciar sesión");
    router.push("/dashboard");
    router.refresh();
  }

  async function withGoogle() {
    setLoading(true);
    setServerErrors({});
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
      const cred = await signInWithPopup(firebaseAuth(), new GoogleAuthProvider());
      await exchange(cred.user);
    } catch (err) {
      const msg = err instanceof Error && !(err as { code?: string }).code ? err.message : firebaseMessage(err);
      if (msg) setServerErrors({ form: msg });
    } finally {
      setLoading(false);
    }
  }

  // Email + password through Firebase. Accounts made before Firebase existed are not in it, so login falls back to the old route.
  async function withFirebase(): Promise<boolean> {
    const { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword, signOut, updateProfile } = await import("firebase/auth");
    const auth = firebaseAuth();
    try {
      if (mode === "register") {
        const cred = await createUserWithEmailAndPassword(auth, values.email, values.password);
        await updateProfile(cred.user, { displayName: values.name }).catch(() => {});
        await sendEmailVerification(cred.user);
        await signOut(auth);
        setMode("login");
        setServerErrors({ form: "Cuenta creada. Te enviamos un correo: verifícalo y luego inicia sesión." });
        return true;
      }
      const cred = await signInWithEmailAndPassword(auth, values.email, values.password);
      if (!cred.user.emailVerified) {
        await sendEmailVerification(cred.user).catch(() => {});
        await signOut(auth);
        setServerErrors({ form: "Verifica tu correo: te reenviamos el enlace. Luego inicia sesión." });
        return true;
      }
      await exchange(cred.user);
      return true;
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      if (mode === "login" && (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password")) return false;
      const msg = code ? firebaseMessage(err) : err instanceof Error ? err.message : "";
      if (msg) setServerErrors({ form: msg });
      return true;
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });
    if (!result.success) return;
    setLoading(true);
    setServerErrors({});
    try {
      if (firebaseEnabled && (await withFirebase())) return;
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
              mode === m ? "border-transparent bg-gradient-to-r from-[var(--b1)] to-[var(--b2)] text-[#2a2012] shadow-[0_0_14px_rgba(224,181,80,0.45)]" : "bg-card text-ink-soft hover:text-ink"
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

        {firebaseEnabled && (
          <>
            <p className="hx-mute flex items-center gap-3 text-xs before:h-px before:flex-1 before:bg-[var(--line)] after:h-px after:flex-1 after:bg-[var(--line)]">o</p>
            <button type="button" onClick={withGoogle} disabled={loading} className="hx-btn w-full gap-2 !py-3">
              <svg aria-hidden width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
                <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
              </svg>
              Continuar con Google
            </button>
          </>
        )}
      </form>
    </>
  );
}
