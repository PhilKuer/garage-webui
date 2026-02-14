import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

type AuthProviders = {
  passwordEnabled: boolean;
  oidcEnabled: boolean;
  oidcProviderName?: string;
  ldapEnabled: boolean;
};

type AuthResponse = {
  enabled: boolean;
  authenticated: boolean;
  providers: AuthProviders;
};

export const useAuth = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["auth"],
    queryFn: () => api.get<AuthResponse>("/auth/status"),
    retry: false,
  });
  return {
    isLoading,
    isEnabled: data?.enabled,
    isAuthenticated: data?.authenticated,
    providers: data?.providers,
  };
};
