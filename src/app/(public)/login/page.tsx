import { LoginForm } from "./login-form";
import { AuthShell } from "@/components/auth/auth-shell";

const oauthErrors: Record<string, string> = {
  oauth_method: "That sign-in method is not available.",
  oauth_unavailable: "Social sign-in is temporarily unavailable.",
  oauth_callback: "The social sign-in attempt was invalid or expired. Please try again.",
  account_not_allowed: "This sign-in method is available only to eligible parent and student accounts.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const errorValue = (await searchParams).error;
  const errorCode = Array.isArray(errorValue) ? errorValue[0] : errorValue;
  const oauthError = errorCode ? oauthErrors[errorCode] ?? "Sign in could not be completed." : "";

  return (
    <AuthShell
      eyebrow="Secure access"
      title="Sign in to Tution"
      description="Owners, managers, parents, and students all start here. We will send you to the right dashboard after sign-in."
    >
      <LoginForm oauthError={oauthError} />
    </AuthShell>
  );
}
