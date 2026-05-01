# Bug Manifest

## Bug 1: Hardcoded JWT Secret
- **Category:** Security
- **Severity:** Critical
- **File:** apps/backend/src/main.ts
- **Line:** ~4
- **Description:** A JWT secret is hardcoded as a module-level constant (`JWT_SECRET = 'supersecret123'`). Any attacker with read access to the source code or repository can forge valid tokens and impersonate any user.
- **How to find it:** Search for string literals assigned to variables named `SECRET`, `JWT_SECRET`, or similar. Check if secrets are sourced from `process.env`. Also flagged by tools like `gitleaks` or `detect-secrets`.
- **Fix:** Remove the hardcoded constant. Source the secret exclusively from an environment variable: `const JWT_SECRET = process.env.JWT_SECRET;` and validate it is defined at startup.

---

## Bug 2: Overly Permissive CORS
- **Category:** Security
- **Severity:** High
- **File:** apps/backend/src/main.ts
- **Line:** ~7-11
- **Description:** `app.enableCors({ origin: '*', methods: '*', allowedHeaders: '*' })` allows any origin to call the API with any HTTP method and header. This defeats the browser's same-origin protections and exposes authenticated endpoints to cross-site request forgery and data exfiltration from malicious sites.
- **How to find it:** Search for `enableCors` in NestJS bootstrap files. Look for wildcard `'*'` values for `origin`, `methods`, and `allowedHeaders`.
- **Fix:** Restrict `origin` to an explicit allowlist of trusted origins (e.g. the Remix app's domain). Enumerate only the HTTP methods and headers the API actually requires.

---

## Bug 3: PII Logged to stdout in Remix Loader
- **Category:** Security
- **Severity:** High
- **File:** apps/remix-app/app/routes/_index.tsx
- **Line:** ~31
- **Description:** `console.log("Loader users:", JSON.stringify(users))` dumps the entire user list — including emails and other personal data — to the server's standard output on every page load. In production this data ends up in log aggregators, potentially accessible to anyone with log access.
- **How to find it:** Grep for `console.log` in loader and action functions. Check what data structures are being serialized. Look for `JSON.stringify` with model objects passed directly.
- **Fix:** Remove the log statement. If debugging user counts is needed, log only metadata: `console.log("Loaded user count:", users.length)`.

---

## Bug 4: Plaintext Credentials Logged in Action Handler
- **Category:** Security
- **Severity:** High
- **File:** apps/remix-app/app/routes/_index.tsx
- **Line:** ~45
- **Description:** The `action` handler extracts `email` and `password` from `formData` and immediately logs both in plaintext: `console.log(\`Login attempt: email=${email} password=${password}\`)`. Passwords are exposed in every log pipeline the application feeds.
- **How to find it:** Search for `console.log` in action functions. Look for any variable named `password`, `secret`, `token`, or `credential` appearing in log calls.
- **Fix:** Remove the log. Never log passwords. If auditing login attempts is required, log only the email (and even that should be treated as PII under GDPR/CCPA).

---

## Bug 5: N+1 Query in getUsers()
- **Category:** Performance
- **Severity:** High
- **File:** packages/business/src/repositories/user-repository.ts
- **Line:** ~11-18
- **Description:** `getUsers()` first fetches all user IDs with `findMany({ select: { id: true } })`, then issues a separate `findUnique` for each ID inside a sequential `for...of` loop. For N users this produces N+1 database round-trips instead of one, and they run sequentially rather than in parallel, making latency scale linearly with the number of users.
- **How to find it:** Look for `findMany` followed by a loop that calls `findUnique` or `findFirst`. The pattern is: collect IDs, then re-query individually. Also watch for `await` inside `for...of` without `Promise.all`.
- **Fix:** Replace the entire method body with a single `return this.prisma.user.findMany();` — Prisma fetches full rows in one query.

---

## Bug 6: Sequential Awaits Where Parallel Was Used (healthcheck)
- **Category:** Performance
- **Severity:** Medium
- **File:** apps/remix-app/app/routes/healthcheck.tsx
- **Line:** ~14-19
- **Description:** The healthcheck endpoint previously ran the DB count query and the HTTP self-ping concurrently via `Promise.all`. The current code awaits each operation sequentially, doubling the minimum response time. Under slow DB conditions this also blocks the HTTP check unnecessarily.
- **How to find it:** Look for two consecutive `await` statements in a function where the second does not depend on the result of the first. Check git history or compare against `Promise.all` patterns elsewhere.
- **Fix:** Restore `const [count] = await Promise.all([Service.userRepository.getUsersCount(), fetch(...).then(...)])` to run both operations in parallel.

---

## Bug 7: Missing Null Check Causes Runtime Crash (NestJS controller)
- **Category:** Reliability
- **Severity:** High
- **File:** apps/backend/src/app.controller.ts
- **Line:** ~21
- **Description:** `getUser` calls `this.appService.findUser(id)` which returns `undefined` when the ID is not found (the return type annotation is wrong — it claims to always return the object). The controller then accesses `user.id` and `user.name` directly, throwing `TypeError: Cannot read properties of undefined` and returning a 500 to the caller with no meaningful error message.
- **How to find it:** Trace return values from service methods through to controller usage. Check whether the return type can realistically be `undefined` at runtime (e.g. dictionary lookups, `.find()`, Prisma's `findUnique`). Look for immediate property access with no null guard.
- **Fix:** Check for null/undefined before accessing properties and throw an appropriate NestJS `NotFoundException`: `if (!user) throw new NotFoundException(\`User ${id} not found\`);`

---

## Bug 8: Empty Catch Block Silently Swallows Healthcheck Errors
- **Category:** Reliability
- **Severity:** Medium
- **File:** apps/remix-app/app/routes/healthcheck.tsx
- **Line:** ~22-24
- **Description:** The `catch` block returns a `500` response but no longer logs the error. When the DB is unreachable or the self-ping fails, the healthcheck returns `ERROR` with no observable detail. Operators cannot distinguish a transient network issue from a crashed database — and monitoring alert messages contain no actionable information.
- **How to find it:** Search for `catch` blocks that contain only a `return` or `res.status` call. Any catch that does not call `console.error`, a logger, or rethrow is a red flag.
- **Fix:** Restore error logging inside the catch: `console.error("healthcheck failed", { error });`.

---

## Bug 9: TypeScript strict Mode Disabled
- **Category:** Developer Tooling
- **Severity:** Medium
- **File:** apps/remix-app/tsconfig.json
- **Line:** ~23
- **Description:** `"strict": false` disables the entire family of TypeScript strict checks — `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, etc. This allows the null-access bugs and implicit `any` types that `strict: true` would have caught at compile time, and means the type annotations throughout the codebase cannot be trusted.
- **How to find it:** Open `tsconfig.json` and look at `compilerOptions.strict`. Also check for `strictNullChecks: false` set independently. Compare against baseline config files in `config/tsconfig/`.
- **Fix:** Set `"strict": true`. Fix any type errors that surface (they were real bugs hiding behind the flag).

---

## Bug 10: Vitest Coverage Thresholds Set to Zero
- **Category:** Developer Tooling
- **Severity:** Low
- **File:** apps/remix-app/vitest.config.ts
- **Line:** ~13-20
- **Description:** A `coverage.thresholds` block exists but every threshold (`lines`, `functions`, `branches`, `statements`) is set to `0`. This looks like coverage enforcement is configured, but it enforces nothing — CI will always pass regardless of how little code is covered.
- **How to find it:** Open `vitest.config.ts` (or `jest.config.*`) and look for `thresholds` or `coverageThreshold` blocks. Verify the numeric values are non-zero and meaningful (typically 80+ for a production codebase).
- **Fix:** Set meaningful thresholds, e.g. `lines: 80, functions: 80, branches: 70, statements: 80`. Add a CI step that runs `vitest run --coverage` and fails the build if thresholds are not met.

---

## Bug 11: Session Token Logged in Shared Utility
- **Category:** Developer Tooling
- **Severity:** Medium
- **File:** apps/remix-app/app/utils.ts
- **Line:** ~10
- **Description:** `getAuthToken` calls `console.log("getAuthToken called with token:", sessionToken)` before returning. Because this is a shared utility, any call site (server-side or client-side) will emit the raw session token to stdout or the browser console. Session tokens have the same sensitivity as passwords.
- **How to find it:** Grep all shared utility files for `console.log`. Look for variables named `token`, `secret`, `key`, `credential`, `session` being passed to log calls. This pattern is easy to miss because it's in a utility rather than a route handler.
- **Fix:** Remove the `console.log` statement entirely. If tracing auth calls is needed during development, use a conditional `if (process.env.DEBUG_AUTH) console.debug("getAuthToken invoked");` that never logs the token value.
