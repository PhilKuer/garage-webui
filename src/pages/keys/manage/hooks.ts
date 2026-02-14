import api from "@/lib/api";
import {
  useMutation,
  UseMutationOptions,
  useQuery,
} from "@tanstack/react-query";

export type KeyBucket = {
  id: string;
  globalAliases: string[];
  localAliases: string[];
  permissions: {
    read: boolean;
    write: boolean;
    owner: boolean;
  };
};

export type KeyInfo = {
  accessKeyId: string;
  secretAccessKey: string;
  name: string;
  permissions: { createBucket: boolean };
  buckets: KeyBucket[];
};

export const useKey = (id?: string | null) => {
  return useQuery({
    queryKey: ["key", id],
    queryFn: () =>
      api.get<KeyInfo>("/v2/GetKeyInfo", {
        params: { id, showSecretKey: "true" },
      }),
    enabled: !!id,
  });
};

export const useUpdateKey = (
  options?: UseMutationOptions<any, Error, { id: string; name: string }>
) => {
  return useMutation({
    mutationFn: (payload) =>
      api.post("/v2/UpdateKey", {
        params: { id: payload.id },
        body: { name: payload.name },
      }),
    ...options,
  });
};
