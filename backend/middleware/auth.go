package middleware

import (
	"errors"
	"khairul169/garage-webui/utils"
	"net/http"
)

func AuthMiddleware(authEnabled bool, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !authEnabled {
			next.ServeHTTP(w, r)
			return
		}

		auth := utils.Session.Get(r, "authenticated")
		if auth == nil || !auth.(bool) {
			utils.ResponseErrorStatus(w, errors.New("unauthorized"), http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}
