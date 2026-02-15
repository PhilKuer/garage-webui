package router

import (
	"encoding/json"
	"errors"
	"khairul169/garage-webui/schema"
	"khairul169/garage-webui/utils"
	"net/http"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

type Auth struct {
	OIDC *OIDCAuth
	LDAP *LDAPAuth
}

func NewAuth() *Auth {
	return &Auth{
		OIDC: NewOIDCAuth(),
		LDAP: NewLDAPAuth(),
	}
}

func (c *Auth) IsEnabled() bool {
	return utils.GetEnv("AUTH_USER_PASS", "") != "" || c.OIDC != nil || c.LDAP != nil
}

func (c *Auth) Login(w http.ResponseWriter, r *http.Request) {
	// Check if a specific provider was requested
	provider := r.URL.Query().Get("provider")

	if provider == "ldap" && c.LDAP != nil {
		c.LDAP.Login(w, r)
		return
	}

	// Default: password-based login
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.ResponseError(w, err)
		return
	}

	userPass := strings.Split(utils.GetEnv("AUTH_USER_PASS", ""), ":")
	if len(userPass) < 2 {
		utils.ResponseErrorStatus(w, errors.New("password authentication not configured"), 500)
		return
	}

	if strings.TrimSpace(body.Username) != userPass[0] || bcrypt.CompareHashAndPassword([]byte(userPass[1]), []byte(body.Password)) != nil {
		utils.ResponseErrorStatus(w, errors.New("invalid username or password"), 401)
		return
	}

	utils.Session.Set(r, "authenticated", true)
	utils.Session.Set(r, "auth_provider", "password")
	utils.ResponseSuccess(w, map[string]bool{
		"authenticated": true,
	})
}

func (c *Auth) Logout(w http.ResponseWriter, r *http.Request) {
	utils.Session.Clear(r)
	utils.ResponseSuccess(w, true)
}

func (c *Auth) GetStatus(w http.ResponseWriter, r *http.Request) {
	isAuthenticated := false
	authSession := utils.Session.Get(r, "authenticated")

	if authSession != nil {
		if val, ok := authSession.(bool); ok && val {
			isAuthenticated = true
		}
	}

	providers := schema.AuthConfig{
		PasswordEnabled: utils.GetEnv("AUTH_USER_PASS", "") != "",
		OIDCEnabled:     c.OIDC != nil,
		LDAPEnabled:     c.LDAP != nil,
	}

	if c.OIDC != nil {
		providers.OIDCProviderName = c.OIDC.GetProviderName()
	}

	enabled := c.IsEnabled()

	// If no auth is configured, treat as authenticated
	if !enabled {
		isAuthenticated = true
	}

	utils.ResponseSuccess(w, schema.AuthStatus{
		Enabled:       enabled,
		Authenticated: isAuthenticated,
		Providers:     providers,
	})
}
