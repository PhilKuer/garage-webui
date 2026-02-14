import api from "@/lib/api";
import {
  useMutation,
  UseMutationOptions,
  useQuery,
} from "@tanstack/react-query";
import { AdminToken } from "./types";
import { CreateAdminTokenSchema } from "./schema";

export const useAdminTokens = () => {
  return useQuery({
    queryKey: ["admin-tokens"],
    queryFn: () => api.get<AdminToken[]>("/v2/ListAdminTokens"),
  });
};

export const useCreateAdminToken = (
  options?: UseMutationOptions<any, Error, CreateAdminTokenSchema>
) => {
  return useMutation({
    mutationFn: (data) => {
      const body: Record<string, any> = { name: data.name };
      if (data.expiration) {
        body.expiration = data.expiration;
      }
      if (data.scope) {
        body.scope = data.scope
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return api.post("/v2/CreateAdminToken", { body });
    },
    ...options,
  });
};

export const useDeleteAdminToken = (
  options?: UseMutationOptions<any, Error, string>
) => {
  return useMutation({
    mutationFn: (id) => api.post("/v2/DeleteAdminToken", { body: { id } }),
    ...options,
  });
};
