export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
};

export type SessionIdentity = {
  unionId: string;
  clientId: string;
};

export type SessionPayload = SessionIdentity & {
  version: number;
};

export type UserProfile = {
  user_id: string;
  name: string;
  avatar_url: string;
};
