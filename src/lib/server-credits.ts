import "server-only";

import type {
  AdminCreditContext,
  CreditChild,
  CreditLedgerEntry,
  CreditMutationResult,
  CreditWallet,
  ViewerCreditContext,
  ViewerCreditWallet,
} from "@/lib/credit-types";

export type BackendCreditChild = {
  id: string;
  first_name: string;
  last_name: string;
  people_code: string;
  centre_id: string;
  centre_name: string;
};

export type BackendCreditWallet = {
  id?: string;
  parent_profile_id: string;
  parent_first_name: string;
  parent_last_name: string;
  parent_email: string;
  parent_people_code: string;
  balance_credits: number;
  children: BackendCreditChild[];
};

export type BackendCreditLedgerEntry = {
  id: string;
  wallet_id: string;
  centre_id: string;
  centre_name: string;
  kind: string;
  origin: string;
  delta_credits: number;
  balance_after_credits: number;
  payment_method?: string;
  payment_reference?: string;
  note?: string;
  reversal_of_entry_id?: string;
  reference_type?: string;
  reference_id?: string;
  created_by_name?: string;
  created_at: string;
  reversible: boolean;
};

export type BackendAdminCreditContext = {
  centre_id: string;
  centre_name: string;
  wallets: BackendCreditWallet[];
  entries: BackendCreditLedgerEntry[];
};

export type BackendViewerCreditWallet = { wallet: BackendCreditWallet; entries: BackendCreditLedgerEntry[] };
export type BackendViewerCreditContext = { wallets: BackendViewerCreditWallet[] };
export type BackendCreditMutationResult = { wallet: BackendCreditWallet; entry: BackendCreditLedgerEntry };

export function mapCreditChild(value: BackendCreditChild): CreditChild {
  return { id: value.id, firstName: value.first_name, lastName: value.last_name, peopleCode: value.people_code, centreId: value.centre_id, centreName: value.centre_name };
}

export function mapCreditWallet(value: BackendCreditWallet): CreditWallet {
  return { id: value.id, parentProfileId: value.parent_profile_id, parentFirstName: value.parent_first_name, parentLastName: value.parent_last_name, parentEmail: value.parent_email, parentPeopleCode: value.parent_people_code, balanceCredits: value.balance_credits, children: (value.children ?? []).map(mapCreditChild) };
}

export function mapCreditEntry(value: BackendCreditLedgerEntry): CreditLedgerEntry {
  return { id: value.id, walletId: value.wallet_id, centreId: value.centre_id, centreName: value.centre_name, kind: value.kind, origin: value.origin, deltaCredits: value.delta_credits, balanceAfterCredits: value.balance_after_credits, paymentMethod: value.payment_method, paymentReference: value.payment_reference, note: value.note, reversalOfEntryId: value.reversal_of_entry_id, referenceType: value.reference_type, referenceId: value.reference_id, createdByName: value.created_by_name, createdAt: value.created_at, reversible: value.reversible };
}

export function mapAdminCreditContext(value: BackendAdminCreditContext): AdminCreditContext {
  return { centreId: value.centre_id, centreName: value.centre_name, wallets: (value.wallets ?? []).map(mapCreditWallet), entries: (value.entries ?? []).map(mapCreditEntry) };
}

export function mapViewerCreditWallet(value: BackendViewerCreditWallet): ViewerCreditWallet {
  return { wallet: mapCreditWallet(value.wallet), entries: (value.entries ?? []).map(mapCreditEntry) };
}

export function mapViewerCreditContext(value: BackendViewerCreditContext): ViewerCreditContext {
  return { wallets: (value.wallets ?? []).map(mapViewerCreditWallet) };
}

export function mapCreditMutation(value: BackendCreditMutationResult): CreditMutationResult {
  return { wallet: mapCreditWallet(value.wallet), entry: mapCreditEntry(value.entry) };
}
