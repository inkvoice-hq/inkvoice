// app/login/page.tsx
// Reads ?mode=signup on the server, so the page arrives as "Create your
// account" straight away instead of flashing the log-in form first.
import type { Metadata } from "next";
import { LoginView } from "./LoginView";

export const metadata: Metadata = { title: "Log in or sign up — Zarbill" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return <LoginView initialMode={mode === "signup" ? "signup" : "login"} />;
}
