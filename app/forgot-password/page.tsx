import type { Metadata } from "next";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default async function ForgotPasswordPage(
  { searchParams }: { searchParams: Promise<{ expired?: string }> }
) {
  const { expired } = await searchParams;
  return <ForgotForm expired={expired === "1"} />;
}
