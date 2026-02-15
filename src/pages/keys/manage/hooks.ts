import api from "@/lib/api";
import { useMutation, UseMutationOptions, useQuery } from "@tanstack/react-query";
import { KeyInfo } from "./types";

export const useKeyInfo = (id?: string) => {
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
  options?: UseMutationOptions<any, Error, any>
) => {
  return useMutation({
    mutationFn: (body: any) => api.post("/v2/UpdateKey", { body }),
    ...options,
  });
};
