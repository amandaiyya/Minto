"use client";

import { SubmitEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type AuthFormProps = {
  mode: "login" | "register";
};

type FieldErrors = Partial<Record<"name" | "email" | "password" | "confirmPassword", string>>;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeAuthError(status: number | undefined, code: string | undefined, mode: AuthFormProps["mode"]): string {
  if (status === 429) return "Too many attempts. Please wait a minute before trying again.";

  if (mode === "register") {
    if (code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      return "We couldn’t create this account. If you’ve already registered, try signing in.";
    }
    if (code === "INVALID_EMAIL") return "Enter a valid email address.";
    if (code === "PASSWORD_TOO_SHORT" || code === "PASSWORD_TOO_LONG" || code === "INVALID_PASSWORD") {
      return "Use a password between 12 and 128 characters.";
    }
    if (status === 400 || status === 422) return "Please check your details and try again.";
    return "We couldn’t create your account right now. Please try again.";
  }

  if (code === "INVALID_EMAIL") return "Enter a valid email address.";
  if (code === "INVALID_EMAIL_OR_PASSWORD" || status === 401) return "Email or password is incorrect.";
  if (status === 400 || status === 422) return "Check your email and password, then try again.";
  return "We couldn’t sign you in right now. Please try again.";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    const normalizedEmail = email.trim();

    if (isRegister && !name.trim()) errors.name = "Enter your name.";
    if (!normalizedEmail) errors.email = "Enter your email address.";
    else if (!isValidEmail(normalizedEmail)) errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Enter your password.";
    else if (isRegister && password.length < 12) errors.password = "Use at least 12 characters.";
    else if (isRegister && password.length > 128) errors.password = "Use no more than 128 characters.";
    if (isRegister && !confirmPassword) errors.confirmPassword = "Confirm your password.";
    else if (isRegister && password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";

    return errors;
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setErrorMessage(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPending(true);
    try {
      const result = isRegister
        ? await authClient.signUp.email({
            name: name.trim(),
            email: email.trim(),
            password,
          })
        : await authClient.signIn.email({
            email: email.trim(),
            password,
          });

      if (result.error) {
        setErrorMessage(safeAuthError(result.error.status, result.error.code, mode));
        return;
      }

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setShowPasswords(false);
      setFieldErrors({});

      router.replace("/");
      router.refresh();
    } catch {
      setErrorMessage("We couldn’t reach the authentication service. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-content">
        <Link className="brand auth-brand" href="/" aria-label="Minto home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32"><path d="M8 22V11l8 7 8-7v11M16 18v5" /></svg>
          </span>
          <span className="brand-name">minto<span>.</span></span>
        </Link>

        <section className="auth-card" aria-labelledby="auth-title">
          <p className="eyebrow">YOUR MONEY, IN GOOD ORDER</p>
          <h1 id="auth-title">{isRegister ? "Create your account" : "Welcome back"}</h1>
          <p className="auth-subtitle">
            {isRegister
              ? "A little clarity starts with a place to keep track."
              : "Sign in to see your expenses and pick up where you left off."}
          </p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {isRegister && (
              <div className="auth-field">
                <label htmlFor="auth-name">Name</label>
                <input
                  className="auth-input"
                  id="auth-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? "auth-name-error" : undefined}
                  disabled={pending}
                  required
                />
                {fieldErrors.name && <span className="auth-field-error" id="auth-name-error">{fieldErrors.name}</span>}
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="auth-email">Email</label>
              <input
                className="auth-input"
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "auth-email-error" : undefined}
                disabled={pending}
                required
              />
              {fieldErrors.email && <span className="auth-field-error" id="auth-email-error">{fieldErrors.email}</span>}
            </div>

            <div className="auth-field">
              <label htmlFor="auth-password">Password</label>
              <div className="auth-password-wrap">
                <input
                  className="auth-input"
                  id="auth-password"
                  name="password"
                  type={showPasswords ? "text" : "password"}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "auth-password-error" : undefined}
                  disabled={pending}
                  required
                />
                <button
                  className="auth-visibility"
                  type="button"
                  onClick={() => setShowPasswords((visible) => !visible)}
                  aria-label={showPasswords ? "Hide password" : "Show password"}
                  disabled={pending}
                >
                  {showPasswords ? "Hide" : "Show"}
                </button>
              </div>
              {fieldErrors.password && <span className="auth-field-error" id="auth-password-error">{fieldErrors.password}</span>}
            </div>

            {isRegister && (
              <div className="auth-field">
                <label htmlFor="auth-confirm-password">Confirm password</label>
                <input
                  className="auth-input"
                  id="auth-confirm-password"
                  name="confirmPassword"
                  type={showPasswords ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={fieldErrors.confirmPassword ? "auth-confirm-password-error" : undefined}
                  disabled={pending}
                  required
                />
                {fieldErrors.confirmPassword && <span className="auth-field-error" id="auth-confirm-password-error">{fieldErrors.confirmPassword}</span>}
              </div>
            )}

            {isRegister && <p className="auth-password-hint">Use 12–128 characters. Your password is never trimmed.</p>}
            {errorMessage && <p className="auth-error" role="alert">{errorMessage}</p>}

            <button className="button button-primary auth-submit" type="submit" disabled={pending}>
              {pending ? (isRegister ? "Creating account…" : "Signing in…") : (isRegister ? "Create account" : "Sign in")}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? "Already have an account?" : "New to Minto?"}{" "}
            <Link href={isRegister ? "/login" : "/register"} aria-disabled={pending}>
              {isRegister ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
