import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { loginSchema } from "./schema";
import api from "@/lib/api";
import { toast } from "sonner";

type LoginOptions = {
  provider?: "password" | "ldap";
};

export const useLogin = (options?: LoginOptions) => {
  const queryClient = useQueryClient();
  const provider = options?.provider || "password";

  return useMutation({
    mutationFn: async (body: z.infer<typeof loginSchema>) => {
      return api.post(`/auth/login?provider=${provider}`, { body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
    onError: (err) => {
      toast.error(err?.message || "Unknown error");
    },
  });
};
