import type { User } from "@db/schema";
import type {
  Company,
  Contract,
  UserOrganizationScope,
  Worker,
} from "@db/schema";

export type LegacyUserRole = User["role"];

export type IdentityUserRecord = Pick<
  User,
  | "id"
  | "unionId"
  | "name"
  | "email"
  | "role"
  | "active"
  | "createdAt"
  | "updatedAt"
  | "lastSignInAt"
>;

export type IdentityPersonRecord = Pick<
  Worker,
  | "id"
  | "firstName"
  | "lastName"
  | "fiscalCode"
  | "email"
  | "phone"
  | "companyId"
  | "siteId"
  | "contractId"
  | "status"
  | "active"
  | "deletedAt"
  | "createdAt"
  | "updatedAt"
>;

export type IdentityCompanyRecord = Pick<
  Company,
  | "id"
  | "name"
  | "vatNumber"
  | "fiscalCode"
  | "isCooperative"
  | "active"
  | "createdAt"
  | "updatedAt"
>;

export type IdentityScopeRecord = Pick<
  UserOrganizationScope,
  "id" | "userId" | "companyId" | "siteId" | "contractId" | "active"
> & {
  siteCompanyId?: number | null;
  contractSiteId?: Contract["siteId"] | null;
};
