package schema

type AuthConfig struct {
	PasswordEnabled bool `json:"passwordEnabled"`
	OIDCEnabled     bool `json:"oidcEnabled"`
	OIDCProviderName string `json:"oidcProviderName,omitempty"`
	LDAPEnabled     bool `json:"ldapEnabled"`
}

type AuthStatus struct {
	Enabled       bool       `json:"enabled"`
	Authenticated bool       `json:"authenticated"`
	Providers     AuthConfig `json:"providers"`
}
