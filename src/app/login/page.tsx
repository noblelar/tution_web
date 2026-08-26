import { LoginForm } from "./login-form";

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
    <main className="baseline-shell">
      <section aria-labelledby="login-title" className="baseline-card login-card">
        <p className="eyebrow">Secure access</p>
        <h1 id="login-title">Sign in to Tution</h1>
        <p>
          Owners and managers use their password followed by mandatory MFA.
          Parents and students may also use any enabled social or email-code method.
        </p>
        <LoginForm oauthError={oauthError} />
      </section>
    </main>
  );
}
