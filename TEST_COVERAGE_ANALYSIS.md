# Test Coverage Analysis

**Date:** 2026-02-15
**Current coverage:** 0% — no test framework configured, no test files exist

---

## Executive Summary

The codebase has **zero test coverage** across both the Go backend (~1,600 lines) and the React/TypeScript frontend (~2,700 lines of logic). There are no test frameworks installed, no test configuration files, and no test scripts. This document identifies the highest-impact areas for introducing tests.

---

## 1. Critical Priority — Backend Authentication & Authorization

**Files:**
- `backend/router/auth.go` (104 lines) — password login with bcrypt, session management
- `backend/router/auth_oidc.go` (180 lines) — OAuth2/OIDC flow with state management and token validation
- `backend/router/auth_ldap.go` (182 lines) — LDAP bind, group membership filtering, StartTLS
- `backend/middleware/auth.go` (25 lines) — session-based authorization gate

**Why this is critical:** Authentication is the security boundary of the application. Bugs here can lead to unauthorized access or locked-out users. The OIDC and LDAP integrations involve complex multi-step flows with external services that are easy to break during refactoring.

**Recommended tests:**
- Bcrypt password validation (correct, incorrect, empty)
- Session creation/retrieval/clearing lifecycle
- Middleware rejecting unauthenticated requests and passing authenticated ones
- OIDC state parameter generation and verification
- OIDC token exchange error handling
- LDAP bind success/failure, group membership filtering
- Auth-disabled fallback behavior

---

## 2. Critical Priority — Backend S3/Browse Operations

**Files:**
- `backend/router/browse.go` (378 lines) — ListObjects, PutObject, DeleteObject, DownloadObject, presigned URLs

**Why this is critical:** This is the largest and most complex handler. It manages file uploads, recursive deletion, pagination with continuation tokens, and presigned URL generation. A bug in recursive deletion could delete unintended objects.

**Recommended tests:**
- Pagination with continuation tokens (single page, multi-page, empty results)
- Prefix/delimiter handling for folder simulation
- Recursive vs. single-object deletion
- File upload with metadata preservation
- Presigned URL generation with correct expiration
- Error handling for S3 failures (permission denied, bucket not found)

---

## 3. Critical Priority — Backend Garage API Client

**Files:**
- `backend/utils/garage.go` (~100 lines) — config loading (TOML), endpoint construction, AWS signature v4 signing, HTTP client

**Why this is critical:** Every backend operation depends on this module. Incorrect endpoint construction or signing breaks all API calls. Environment variable overrides add complexity.

**Recommended tests:**
- TOML config parsing (valid, malformed, missing fields)
- Endpoint URL construction from `garage.toml` addresses (host:port, with/without scheme)
- Environment variable override precedence (`API_BASE_URL`, `API_ADMIN_KEY`, `S3_ENDPOINT_URL`, `S3_REGION`)
- HTTP request construction with correct headers and signing

---

## 4. Critical Priority — Backend Concurrency Patterns

**Files:**
- `backend/router/buckets.go` (136 lines) — goroutine fan-out with channels for parallel bucket info fetching
- `backend/router/stats.go` (150 lines) — goroutine fan-out for per-node statistics

**Why this is critical:** These handlers use goroutines and channels for parallelism. Bugs can cause goroutine leaks, race conditions, or panics from sends on closed channels. These are hard to catch without tests.

**Recommended tests:**
- Correct aggregation when all goroutines succeed
- Partial failure handling (some goroutines error, others succeed)
- Empty input (no buckets, no nodes)
- Race condition detection with `-race` flag

---

## 5. High Priority — Backend Cache with TTL

**Files:**
- `backend/utils/cache.go` (50 lines) — sync.Map-based cache with time-based expiration

**Why this is high priority:** Caching bugs are subtle — stale data or premature eviction can cause confusing user-facing behavior. Concurrent access patterns make this especially fragile.

**Recommended tests:**
- Cache hit before TTL expiration
- Cache miss after TTL expiration
- Concurrent read/write (with `-race`)
- Cache clearing

---

## 6. High Priority — Frontend API Client

**Files:**
- `src/lib/api.ts` (98 lines) — HTTP client wrapper with error parsing, 401 redirect, FormData/JSON detection

**Why this is high priority:** Every frontend data operation flows through this module. The 401 redirect logic and error parsing determine the user experience when things go wrong.

**Recommended tests:**
- GET with query parameters serialized correctly
- POST with JSON body sets correct Content-Type
- POST with FormData does not override Content-Type
- 401 response triggers redirect to `/login`
- JSON error response extracts `message` field
- Non-JSON error response returns raw text
- Network failure handling

---

## 7. High Priority — Frontend Validation Schemas (Complex)

**Files:**
- `src/pages/cluster/schema.ts` — `calculateCapacity()` / `parseCapacity()` with unit conversion, conditional `capacity` requirement
- `src/pages/keys/schema.ts` — conditional field requirements based on `isImport` flag
- `src/pages/buckets/manage/schema.ts` — nested conditional schemas for website config, quotas, permissions

**Why this is high priority:** These schemas contain the most complex validation logic in the frontend. `calculateCapacity` performs arithmetic that converts between MB/GB/TB — off-by-one errors in the exponent would silently assign wrong capacities to nodes.

**Recommended tests:**
- `calculateCapacity(1, "MB")` → 1,000,000; `(2, "GB")` → 2,000,000,000; `(1, "TB")` → 1,000,000,000,000
- `parseCapacity` round-trips correctly with `calculateCapacity`
- `null`/`undefined` inputs to both functions
- Key schema: import mode requires both `accessKeyId` and `secretAccessKey`; non-import mode does not
- Website config: `websiteAccess=false` allows null config; `websiteAccess=true` requires valid config
- Quota schema: `enabled=true` with coerced number fields
- Permission schema: array of objects with boolean flags

---

## 8. High Priority — Frontend Utility Functions

**Files:**
- `src/lib/utils.ts` (60 lines) — `readableBytes()`, `ucfirst()`, `cn()`, `copyToClipboard()`, `url()`

**Recommended tests:**
- `readableBytes(0)`, `readableBytes(1023)`, `readableBytes(1024)`, `readableBytes(1073741824)`, negative values, NaN
- `ucfirst(null)`, `ucfirst("")`, `ucfirst("hello")`
- `url("/path")` with and without `BASE_PATH`
- `cn()` class merging with conflicting Tailwind classes

---

## 9. Medium Priority — Frontend Hooks

**Files:**
- `src/hooks/useDebounce.ts` — timing and cleanup logic
- `src/hooks/useDisclosure.ts` — dialog state management with DOM refs
- 12 page-level hook files (mutations/queries for each feature area)

**Recommended tests:**
- Debounce fires after delay, resets on repeated calls, cleans up on unmount
- Disclosure open/close/toggle state transitions
- Page hooks: correct API endpoints, query key management, mutation callbacks

---

## 10. Medium Priority — Frontend Components & Pages

**Files:**
- `src/components/ui/` — 9 reusable UI components
- `src/pages/buckets/manage/browse/` — browse tab with prefix history, file uploads, bulk selection

**Recommended tests:**
- UI components: render with various props, disabled states, event callbacks, accessibility attributes
- Browse tab: folder navigation pushes/pops prefix history, file upload limit (20 max), bulk selection state

---

## Recommended Implementation Plan

### Phase 1: Set up test infrastructure

**Backend (Go):**
- Go has built-in testing — no additional framework needed
- Add `testify` for assertions and mocking if desired
- Create test helpers for HTTP handler testing (`httptest.NewRecorder`, `httptest.NewServer`)
- Create mock/stub S3 client interface for browse handler tests

**Frontend (TypeScript/React):**
- Install Vitest (aligns with existing Vite toolchain)
- Install `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`
- Install `msw` (Mock Service Worker) for API mocking
- Add `vitest.config.ts` and `test` script to `package.json`
- Add `jsdom` environment for component tests

### Phase 2: Backend unit tests (highest ROI)

Focus on `utils/garage.go`, `utils/cache.go`, `router/auth.go`, `middleware/auth.go` — these are pure logic with minimal external dependencies and protect the most critical paths.

### Phase 3: Frontend unit tests

Focus on `src/lib/utils.ts`, `src/lib/api.ts`, and the complex Zod schemas in `src/pages/cluster/schema.ts` and `src/pages/buckets/manage/schema.ts` — these are pure functions/schemas that are trivial to test with high value.

### Phase 4: Integration-level tests

Add handler tests for `router/browse.go` and `router/buckets.go` with mocked S3 clients, and React component tests for the browse tab and auth flow.

---

## Summary Table

| Priority | Area | Files | Key Risk |
|----------|------|-------|----------|
| Critical | Backend Auth | 4 files, 491 lines | Security bypass, lockouts |
| Critical | Backend Browse/S3 | 1 file, 378 lines | Data loss from bad deletion |
| Critical | Backend Garage Client | 1 file, ~100 lines | All API calls break |
| Critical | Backend Concurrency | 2 files, 286 lines | Goroutine leaks, races |
| High | Backend Cache | 1 file, 50 lines | Stale data, race conditions |
| High | Frontend API Client | 1 file, 98 lines | Broken error handling, auth |
| High | Frontend Schemas | 3 files, ~150 lines | Wrong capacity values, bad validation |
| High | Frontend Utils | 1 file, 60 lines | Display bugs |
| Medium | Frontend Hooks | 14 files, ~480 lines | Stale queries, timing bugs |
| Medium | Frontend Components | 20+ files, ~1,900 lines | UI regressions |
