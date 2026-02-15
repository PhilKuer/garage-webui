package router

import (
	"encoding/json"
	"fmt"
	"khairul169/garage-webui/utils"
	"net/http"
	"os"
	"strings"

	"github.com/go-ldap/ldap/v3"
)

type LDAPAuth struct {
	URL            string
	BindDN         string
	BindPassword   string
	BaseDN         string
	UserFilter     string
	GroupBaseDN    string
	GroupFilter    string
	RequiredGroups []string
	StartTLS       bool
}

func NewLDAPAuth() *LDAPAuth {
	url := os.Getenv("LDAP_URL")
	if url == "" {
		return nil
	}

	baseDN := os.Getenv("LDAP_BASE_DN")
	if baseDN == "" {
		return nil
	}

	userFilter := utils.GetEnv("LDAP_USER_FILTER", "(&(objectClass=inetOrgPerson)(uid={{username}}))")

	var requiredGroups []string
	if groups := os.Getenv("LDAP_REQUIRED_GROUPS"); groups != "" {
		requiredGroups = strings.Split(groups, ",")
		for i := range requiredGroups {
			requiredGroups[i] = strings.TrimSpace(requiredGroups[i])
		}
	}

	return &LDAPAuth{
		URL:            url,
		BindDN:         os.Getenv("LDAP_BIND_DN"),
		BindPassword:   os.Getenv("LDAP_BIND_PASSWORD"),
		BaseDN:         baseDN,
		UserFilter:     userFilter,
		GroupBaseDN:    utils.GetEnv("LDAP_GROUP_BASE_DN", baseDN),
		GroupFilter:    utils.GetEnv("LDAP_GROUP_FILTER", "(&(objectClass=groupOfNames)(member={{userDN}}))"),
		RequiredGroups: requiredGroups,
		StartTLS:       os.Getenv("LDAP_START_TLS") == "true",
	}
}

func (l *LDAPAuth) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.ResponseError(w, err)
		return
	}

	if strings.TrimSpace(body.Username) == "" || strings.TrimSpace(body.Password) == "" {
		utils.ResponseErrorStatus(w, fmt.Errorf("username and password are required"), http.StatusBadRequest)
		return
	}

	// Connect to LDAP server
	conn, err := ldap.DialURL(l.URL)
	if err != nil {
		utils.ResponseErrorStatus(w, fmt.Errorf("cannot connect to LDAP server: %w", err), http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	// If bind DN is configured, bind as service account first to search for user
	if l.BindDN != "" {
		if err := conn.Bind(l.BindDN, l.BindPassword); err != nil {
			utils.ResponseErrorStatus(w, fmt.Errorf("LDAP service bind failed: %w", err), http.StatusInternalServerError)
			return
		}
	}

	// Search for the user
	userFilter := strings.ReplaceAll(l.UserFilter, "{{username}}", ldap.EscapeFilter(body.Username))
	searchReq := ldap.NewSearchRequest(
		l.BaseDN,
		ldap.ScopeWholeSubtree,
		ldap.NeverDerefAliases,
		1,    // size limit
		10,   // time limit
		false,
		userFilter,
		[]string{"dn"},
		nil,
	)

	result, err := conn.Search(searchReq)
	if err != nil {
		utils.ResponseErrorStatus(w, fmt.Errorf("LDAP search failed: %w", err), http.StatusInternalServerError)
		return
	}

	if len(result.Entries) == 0 {
		utils.ResponseErrorStatus(w, fmt.Errorf("invalid username or password"), http.StatusUnauthorized)
		return
	}

	userDN := result.Entries[0].DN

	// Bind as the user to verify password
	if err := conn.Bind(userDN, body.Password); err != nil {
		utils.ResponseErrorStatus(w, fmt.Errorf("invalid username or password"), http.StatusUnauthorized)
		return
	}

	// Check group membership if required
	if len(l.RequiredGroups) > 0 {
		// Rebind as service account to search groups
		if l.BindDN != "" {
			if err := conn.Bind(l.BindDN, l.BindPassword); err != nil {
				utils.ResponseErrorStatus(w, fmt.Errorf("LDAP service rebind failed: %w", err), http.StatusInternalServerError)
				return
			}
		}

		groupFilter := strings.ReplaceAll(l.GroupFilter, "{{userDN}}", ldap.EscapeFilter(userDN))
		groupFilter = strings.ReplaceAll(groupFilter, "{{username}}", ldap.EscapeFilter(body.Username))

		groupSearch := ldap.NewSearchRequest(
			l.GroupBaseDN,
			ldap.ScopeWholeSubtree,
			ldap.NeverDerefAliases,
			0,    // no size limit
			10,   // time limit
			false,
			groupFilter,
			[]string{"cn"},
			nil,
		)

		groupResult, err := conn.Search(groupSearch)
		if err != nil {
			utils.ResponseErrorStatus(w, fmt.Errorf("LDAP group search failed: %w", err), http.StatusInternalServerError)
			return
		}

		memberOf := make(map[string]bool)
		for _, entry := range groupResult.Entries {
			cn := entry.GetAttributeValue("cn")
			if cn != "" {
				memberOf[cn] = true
			}
		}

		hasAccess := false
		for _, required := range l.RequiredGroups {
			if memberOf[required] {
				hasAccess = true
				break
			}
		}

		if !hasAccess {
			utils.ResponseErrorStatus(w, fmt.Errorf("access denied: user is not a member of any required group"), http.StatusForbidden)
			return
		}
	}

	utils.Session.Set(r, "authenticated", true)
	utils.Session.Set(r, "auth_provider", "ldap")
	utils.ResponseSuccess(w, map[string]bool{
		"authenticated": true,
	})
}
