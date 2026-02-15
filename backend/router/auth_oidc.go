package router

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"khairul169/garage-webui/utils"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

type OIDCAuth struct {
	provider     *oidc.Provider
	oauth2Config *oauth2.Config
	verifier     *oidc.IDTokenVerifier
}

func NewOIDCAuth() *OIDCAuth {
	issuer := os.Getenv("OIDC_ISSUER_URL")
	if issuer == "" {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	provider, err := oidc.NewProvider(ctx, issuer)
	if err != nil {
		fmt.Printf("OIDC: failed to initialize provider: %v\n", err)
		return nil
	}

	clientID := os.Getenv("OIDC_CLIENT_ID")
	clientSecret := os.Getenv("OIDC_CLIENT_SECRET")
	redirectURL := os.Getenv("OIDC_REDIRECT_URL")

	scopes := strings.Split(utils.GetEnv("OIDC_SCOPES", "openid,profile,email"), ",")

	oauth2Config := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Endpoint:     provider.Endpoint(),
		Scopes:       scopes,
	}

	verifier := provider.Verifier(&oidc.Config{ClientID: clientID})

	return &OIDCAuth{
		provider:     provider,
		oauth2Config: oauth2Config,
		verifier:     verifier,
	}
}

func (o *OIDCAuth) GetProviderName() string {
	return utils.GetEnv("OIDC_PROVIDER_NAME", "SSO")
}

func (o *OIDCAuth) RedirectToLogin(w http.ResponseWriter, r *http.Request) {
	state, err := generateRandomState()
	if err != nil {
		utils.ResponseError(w, fmt.Errorf("cannot generate state: %w", err))
		return
	}

	utils.Session.Set(r, "oidc_state", state)

	http.Redirect(w, r, o.oauth2Config.AuthCodeURL(state), http.StatusTemporaryRedirect)
}

func (o *OIDCAuth) HandleCallback(w http.ResponseWriter, r *http.Request) {
	savedState := utils.Session.Get(r, "oidc_state")
	if savedState == nil {
		utils.ResponseErrorStatus(w, fmt.Errorf("no state in session"), http.StatusBadRequest)
		return
	}

	queryState := r.URL.Query().Get("state")
	if queryState != savedState.(string) {
		utils.ResponseErrorStatus(w, fmt.Errorf("state mismatch"), http.StatusBadRequest)
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		errMsg := r.URL.Query().Get("error_description")
		if errMsg == "" {
			errMsg = r.URL.Query().Get("error")
		}
		if errMsg == "" {
			errMsg = "no authorization code received"
		}
		utils.ResponseErrorStatus(w, fmt.Errorf("OIDC error: %s", errMsg), http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	token, err := o.oauth2Config.Exchange(ctx, code)
	if err != nil {
		utils.ResponseErrorStatus(w, fmt.Errorf("token exchange failed: %w", err), http.StatusUnauthorized)
		return
	}

	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		utils.ResponseErrorStatus(w, fmt.Errorf("no id_token in response"), http.StatusUnauthorized)
		return
	}

	idToken, err := o.verifier.Verify(ctx, rawIDToken)
	if err != nil {
		utils.ResponseErrorStatus(w, fmt.Errorf("token verification failed: %w", err), http.StatusUnauthorized)
		return
	}

	var claims map[string]interface{}
	if err := idToken.Claims(&claims); err != nil {
		utils.ResponseErrorStatus(w, fmt.Errorf("cannot parse claims: %w", err), http.StatusUnauthorized)
		return
	}

	// Check required group/role if configured
	requiredClaim := os.Getenv("OIDC_REQUIRED_CLAIM")
	requiredValue := os.Getenv("OIDC_REQUIRED_CLAIM_VALUE")

	if requiredClaim != "" && requiredValue != "" {
		if !checkClaim(claims, requiredClaim, requiredValue) {
			utils.ResponseErrorStatus(w, fmt.Errorf("access denied: required claim not satisfied"), http.StatusForbidden)
			return
		}
	}

	utils.Session.Set(r, "authenticated", true)
	utils.Session.Set(r, "auth_provider", "oidc")

	// Redirect to the app
	basePath := os.Getenv("BASE_PATH")
	redirectTo := basePath + "/"
	http.Redirect(w, r, redirectTo, http.StatusTemporaryRedirect)
}

func checkClaim(claims map[string]interface{}, claimName string, requiredValue string) bool {
	claim, ok := claims[claimName]
	if !ok {
		return false
	}

	switch v := claim.(type) {
	case string:
		return v == requiredValue
	case []interface{}:
		for _, item := range v {
			if str, ok := item.(string); ok && str == requiredValue {
				return true
			}
		}
	case json.Number:
		return v.String() == requiredValue
	}

	return false
}

func generateRandomState() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
