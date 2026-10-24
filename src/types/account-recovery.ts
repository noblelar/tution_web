export type AccountRecoveryRequestInput = {
  email: string;
};

export type PasswordResetConfirmationInput = {
  token: string;
  newPassword: string;
};

export type EmailVerificationConfirmationInput = {
  token: string;
};

export type AccountRecoveryMessage = {
  message: string;
};

export type AccountRecoveryError = {
  error: string;
};
