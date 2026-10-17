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
  searchParams: Promise<{ error?: string | string[]; returnTo?: string | string[] }>;
}) {
  const parameters = await searchParams;
  const errorValue = parameters.error;
  const errorCode = Array.isArray(errorValue) ? errorValue[0] : errorValue;
  const oauthError = errorCode ? oauthErrors[errorCode] ?? "Sign in could not be completed." : "";
  const returnValue = Array.isArray(parameters.returnTo) ? parameters.returnTo[0] : parameters.returnTo;
  const returnTo = safeReturnPath(returnValue);

  return (
    <AuthShell
      eyebrow="Secure access"
      title="Sign in to Tution"
      description="Owners, managers, parents, and students all start here. We will send you to the right dashboard after sign-in."
    >
      <LoginForm oauthError={oauthError} returnTo={returnTo} />
    </AuthShell>
  );
}

function safeReturnPath(value?: string): string {
  if (!value?.startsWith("/app/check-in?token=")) return "";
  if (value.startsWith("//") || value.includes("\\")) return "";
  return value;
}
