export type CreditChild = {
  id: string;
  firstName: string;
  lastName: string;
  peopleCode: string;
  centreId: string;
  centreName: string;
};

export type CreditWallet = {
  id?: string;
  parentProfileId: string;
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPeopleCode: string;
  balanceCredits: number;
  children: CreditChild[];
};

export type CreditLedgerEntry = {
  id: string;
  walletId: string;
  centreId: string;
  centreName: string;
  kind: string;
  origin: string;
  deltaCredits: number;
  balanceAfterCredits: number;
  paymentMethod?: string;
  paymentReference?: string;
  note?: string;
  reversalOfEntryId?: string;
  referenceType?: string;
  referenceId?: string;
  createdByName?: string;
  createdAt: string;
  reversible: boolean;
};

export type AdminCreditContext = {
  centreId: string;
  centreName: string;
  wallets: CreditWallet[];
  entries: CreditLedgerEntry[];
};

export type ViewerCreditWallet = {
  wallet: CreditWallet;
  entries: CreditLedgerEntry[];
};

export type ViewerCreditContext = { wallets: ViewerCreditWallet[] };
export type CreditMutationResult = { wallet: CreditWallet; entry: CreditLedgerEntry };
