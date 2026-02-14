export type AdminToken = {
  id: string;
  name: string;
  createdAt: string;
  expiration: string | null;
  scope: string[] | null;
};
