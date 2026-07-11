import type { User } from "@db/schema";
import type {
  IdentityCompanyRecord,
  IdentityPersonRecord,
  IdentityScopeRecord,
  IdentityUserRecord,
} from "./types";

export interface CoreIdentityRepository {
  findUserById(userId: User["id"]): Promise<IdentityUserRecord | null>;
  findPeopleByUser(user: Pick<User, "email">): Promise<IdentityPersonRecord[]>;
  findCompanyById(companyId: number): Promise<IdentityCompanyRecord | null>;
  listScopesByUserId(userId: User["id"]): Promise<IdentityScopeRecord[]>;
}

