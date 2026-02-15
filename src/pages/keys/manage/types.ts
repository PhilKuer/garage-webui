export type KeyInfo = {
  accessKeyId: string;
  secretAccessKey: string;
  name: string;
  permissions: {
    createBucket: boolean;
  };
  buckets: {
    id: string;
    globalAliases: string[];
    localAliases: string[];
    permissions: {
      read: boolean;
      write: boolean;
      owner: boolean;
    };
  }[];
};
