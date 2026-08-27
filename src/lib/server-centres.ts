import "server-only";

import { CentreFormValues, CentreList, ManagedCentre } from "@/lib/centre-types";

export type BackendManagedCentre = {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  address: string;
  time_zone: string;
  status: "active" | "inactive";
};

export type BackendCentreList = {
  centres: BackendManagedCentre[];
};

export function mapManagedCentre(centre: BackendManagedCentre): ManagedCentre {
  return {
    id: centre.id,
    organizationId: centre.organization_id,
    code: centre.code,
    name: centre.name,
    address: centre.address,
    timeZone: centre.time_zone,
    status: centre.status,
  };
}

export function mapCentreList(list: BackendCentreList): CentreList {
  return { centres: (list.centres ?? []).map(mapManagedCentre) };
}

export function toBackendCentreRequest(values: CentreFormValues) {
  return {
    code: values.code,
    name: values.name,
    address: values.address,
    time_zone: values.timeZone,
  };
}
