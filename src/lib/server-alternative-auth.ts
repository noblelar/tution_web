import "server-only";

export type BackendAlternativeMethods = {
  google: boolean;
  apple: boolean;
  email_otp: boolean;
};

export type AlternativeMethods = {
  google: boolean;
  apple: boolean;
  emailOtp: boolean;
};

export type BackendOAuthStart = {
  authorization_url: string;
  state: string;
  expires_at: string;
};

export function mapAlternativeMethods(
  methods: BackendAlternativeMethods,
): AlternativeMethods {
  return {
    google: methods.google,
    apple: methods.apple,
    emailOtp: methods.email_otp,
  };
}
