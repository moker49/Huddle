export interface LocalUser {
  id: string;
  displayName: string;
  tag: string;
  phoneNumber: string;
  avatarUrl?: string;
}

export interface LocalUserProfileInput {
  displayName: string;
  tag: string;
  phoneNumber: string;
}
