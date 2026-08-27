export type ManagedCentre = {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  address: string;
  timeZone: string;
  status: "active" | "inactive";
};

export type CentreList = {
  centres: ManagedCentre[];
};

export type CentreFormValues = {
  code: string;
  name: string;
  address: string;
  timeZone: string;
};
