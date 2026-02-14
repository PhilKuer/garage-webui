package router

import (
	"khairul169/garage-webui/middleware"
	"net/http"
)

func HandleApiRouter() *http.ServeMux {
	mux := http.NewServeMux()

	auth := NewAuth()

	// Public auth routes (no middleware)
	mux.HandleFunc("POST /auth/login", auth.Login)
	mux.HandleFunc("GET /auth/status", auth.GetStatus)

	if auth.OIDC != nil {
		mux.HandleFunc("GET /auth/oidc/login", auth.OIDC.RedirectToLogin)
		mux.HandleFunc("GET /auth/oidc/callback", auth.OIDC.HandleCallback)
	}

	// Protected routes
	router := http.NewServeMux()
	router.HandleFunc("POST /auth/logout", auth.Logout)

	config := &Config{}
	router.HandleFunc("GET /config", config.GetAll)

	buckets := &Buckets{}
	router.HandleFunc("GET /buckets", buckets.GetAll)

	stats := &Stats{}
	router.HandleFunc("GET /stats/cluster", stats.GetClusterStats)
	router.HandleFunc("GET /stats/nodes", stats.GetNodeStats)

	browse := &Browse{}
	router.HandleFunc("GET /browse/{bucket}", browse.GetObjects)
	router.HandleFunc("GET /browse/{bucket}/{key...}", browse.GetOneObject)
	router.HandleFunc("PUT /browse/{bucket}/{key...}", browse.PutObject)
	router.HandleFunc("DELETE /browse/{bucket}/{key...}", browse.DeleteObject)

	// Proxy request to garage api endpoint
	router.HandleFunc("/", ProxyHandler)

	mux.Handle("/", middleware.AuthMiddleware(auth.IsEnabled(), router))
	return mux
}
