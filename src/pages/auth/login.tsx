import Button from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "react-daisyui";
import { useForm } from "react-hook-form";
import { loginSchema } from "./schema";
import { InputField } from "@/components/ui/input";
import { useLogin } from "./hooks";
import { useAuth } from "@/hooks/useAuth";
import { LogIn } from "lucide-react";
import { API_URL } from "@/lib/api";
import { useState } from "react";

type AuthMethod = "password" | "ldap";

export default function LoginPage() {
  const { providers } = useAuth();
  const hasCredentialLogin =
    providers?.passwordEnabled || providers?.ldapEnabled;
  const hasMultipleCredentialProviders =
    providers?.passwordEnabled && providers?.ldapEnabled;

  const [authMethod, setAuthMethod] = useState<AuthMethod>(
    providers?.ldapEnabled ? "ldap" : "password"
  );

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });
  const login = useLogin({ provider: authMethod });

  return (
    <Card className="w-full max-w-md" bordered>
      <Card.Body>
        <Card.Title tag="h2">Login</Card.Title>
        <p className="text-base-content/60">
          Sign in to access the Garage admin dashboard
        </p>

        {providers?.oidcEnabled && (
          <div className="mt-4">
            <a href={API_URL + "/auth/oidc/login"} className="w-full">
              <Button
                type="button"
                color="primary"
                className="w-full"
              >
                <LogIn size={18} />
                Sign in with {providers.oidcProviderName || "SSO"}
              </Button>
            </a>
          </div>
        )}

        {providers?.oidcEnabled && hasCredentialLogin && (
          <div className="divider text-base-content/40 text-sm">or</div>
        )}

        {hasCredentialLogin && (
          <form onSubmit={form.handleSubmit((v) => login.mutate(v))}>
            {hasMultipleCredentialProviders && (
              <div className="tabs tabs-boxed mb-4">
                <button
                  type="button"
                  className={`tab ${
                    authMethod === "ldap" ? "tab-active" : ""
                  }`}
                  onClick={() => setAuthMethod("ldap")}
                >
                  LDAP
                </button>
                <button
                  type="button"
                  className={`tab ${
                    authMethod === "password" ? "tab-active" : ""
                  }`}
                  onClick={() => setAuthMethod("password")}
                >
                  Password
                </button>
              </div>
            )}

            <InputField
              form={form}
              name="username"
              title="Username"
              placeholder="Enter your username"
            />

            <InputField
              form={form}
              name="password"
              title="Password"
              type="password"
              placeholder="Enter your password"
            />

            <Card.Actions className="mt-4">
              <Button
                type="submit"
                color={providers?.oidcEnabled ? "ghost" : "primary"}
                className="w-full md:w-auto min-w-[100px]"
                loading={login.isPending}
              >
                Login
                {hasMultipleCredentialProviders &&
                  ` with ${authMethod === "ldap" ? "LDAP" : "Password"}`}
              </Button>
            </Card.Actions>
          </form>
        )}
      </Card.Body>
    </Card>
  );
}
