# Category 4: Authentication, Permissions & Data Integrity

## Objective

Implement a secure authentication, authorization, organization-isolation, and data-integrity foundation for the A-Group Subscription Dashboard.

The system must ensure that users can access only the organizations, customers, subscriptions, financial records, reports, and settings they are authorized to access.

Authentication must use Clerk. Application authorization and organization-level data isolation must be enforced by trusted server-side code and the database access layer, not merely by hiding interface elements.

This category integrates with:

- Category 1 — Dashboard Experience & Interface.
- Category 2 — Organizations, Customers & Subscription Operations.
- Category 3 — Finance, Analytics & Reporting.
- Category 5 — Infrastructure, Deployment & Product Reliability.

This document defines the complete scope. Features may be implemented in phases, but no required feature may be silently removed or forgotten.

## Global security rules

1. Never treat a user's identity, organization ID, role, or permission as trustworthy merely because it appears in a client request.
2. Authentication and authorization are separate checks. A signed-in user is not automatically authorized to access every organization or operation.
3. Enforce organization-level isolation on every relevant server-side query, mutation, export, report, background operation, and webhook workflow.
4. Use Clerk as the authentication provider and a documented local application model for organization memberships, roles, and account status where required.
5. Keep server-side secrets, API keys, webhook signing secrets, database URLs, and authentication tokens out of browser code, logs, Git history, and public responses.
6. Protect both browser pages and API endpoints. Redirecting a browser page to sign-in does not protect the corresponding API.
7. Default to denying access when authentication, authorization, membership, account status, or organization scope cannot be verified.
8. Do not grant organization access merely because a user knows or guesses an organization ID.
9. Do not treat a hidden button or disabled UI control as a security boundary.
10. Preserve a traceable history of important security, membership, permission, and financial changes.
11. Do not allow demo mode to bypass authentication or tenant-isolation rules in production.
12. Do not create public administrative backdoors, hardcoded production credentials, or undocumented superuser accounts.
13. Use generic public error messages where detailed errors could expose private information.
14. Never log passwords, secret keys, session tokens, full authorization headers, or webhook signing secrets.
15. Validate all user-controlled input on the server, even when client-side validation also exists.
16. Security features must be tested against direct API requests, manipulated identifiers, expired sessions, disabled accounts, and cross-organization access attempts.

---

## Feature 1: Clerk Authentication

### What it must do

- Integrate Clerk using versions compatible with the existing Next.js application and the selected deployment environment.
- Provide sign-in and sign-out flows.
- Support the approved account registration or invitation-based onboarding policy.
- Maintain authenticated sessions using Clerk's supported mechanisms.
- Provide appropriate loading, error, and session-expiration states.
- Redirect unauthenticated users attempting to access protected browser pages to the configured sign-in flow.
- Return an appropriate unauthorized response from protected API endpoints.
- Support secure local development and production configuration.
- Keep authentication configuration separate from application authorization rules.
- Provide a controlled route back to the originally requested page after successful sign-in, where safe.

### What it must not do

- Store passwords directly in the application database.
- expose Clerk secret keys or privileged tokens to browser code.
- Treat a client-supplied user ID as proof of identity.
- Allow unauthenticated API access because the dashboard page is protected.
- Redirect users to arbitrary external URLs supplied through query parameters.
- Disable authentication in production as a workaround for deployment issues.
- Assume that successful Clerk authentication automatically grants access to every local organization.

### How to implement

- Inspect the existing Next.js version, route structure, middleware or proxy configuration, and package dependencies.
- Review the current Clerk integration guidance for the exact installed framework and the chosen deployment target.
- Centralize authentication checks in reusable server-side helpers appropriate to the installed Clerk SDK.
- Use Clerk's verified server-side session or identity APIs to establish the current user.
- Separate public routes, protected browser routes, and protected API routes explicitly.
- Configure authentication through environment variables and document each required variable in `.env.example` without real secret values.
- Verify sign-in, sign-out, session expiration, unauthorized page access, and unauthorized API access in automated tests.

### Acceptance criteria

- An unauthenticated browser request to `/dashboard` is redirected to the configured sign-in flow.
- An unauthenticated request to `/api/dashboard` returns HTTP 401 with a safe JSON error.
- An authenticated and authorized user can access permitted resources.
- Invalid or expired sessions cannot access protected resources.
- Production authentication cannot be disabled through an accidental missing environment variable.

---

## Feature 2: Local User Records and Account Status

### What it must do

- Maintain a local user record linked to the verified Clerk user identifier.
- Store only the local profile and authorization information needed by the application.
- Support active and disabled application-account states.
- Record relevant account creation, update, disablement, and synchronization timestamps.
- Handle a user who exists in Clerk but has not yet completed application onboarding.
- Handle deleted or unavailable Clerk users according to an explicit account-disablement policy.
- Ensure account status is checked when authorizing protected operations.
- Make account lifecycle behavior predictable when Clerk and the local database temporarily disagree.

### What it must not do

- Use email address alone as the permanent identity key when a stable Clerk identifier is available.
- Assume every Clerk user is authorized to use the application.
- Automatically reactivate a disabled local account simply because a user signs in.
- Permanently delete financial or business records when a user is disabled.
- Store unnecessary authentication secrets or duplicate password data.
- Grant administrative permissions merely because a user has a particular email domain.

### How to implement

- Inspect the existing Prisma schema before proposing user-model changes.
- Define the relationship between Clerk identity and the local user record.
- Define account states and the authorization behavior of each state.
- Make synchronization operations idempotent so repeated events do not create duplicate local users.
- Document how missing local records, deleted identities, and temporary database failures are handled.
- Add tests for new users, existing users, disabled users, deleted identities, and synchronization retries.

### Acceptance criteria

- Each local user is linked to the correct verified Clerk identity.
- Disabled users cannot access protected application data.
- User deactivation does not destroy business records or financial history.
- Synchronization retries do not create duplicate local user records.

---

## Feature 3: Organization and Tenant Isolation

### What it must do

- Enforce strict isolation between organizations.
- Associate each organization-owned record with the correct tenant scope.
- Apply organization authorization to customers, products, plans, subscriptions, invoices, payment records, transactions, budgets, reports, saved filters, and exports as applicable.
- Resolve the active organization through a verified membership and authorized server-side context.
- Support users belonging to multiple organizations where membership permits it.
- Allow organization switching only to organizations the current user is authorized to access.
- Verify that parent and child records belong to the same permitted organization.
- Provide a deliberate, separately authorized mechanism for approved A-Group portfolio-wide access if that feature is included.
- Ensure organization scope applies to create, read, update, delete, list, search, aggregate, export, and background-processing operations.

### What it must not do

- Trust an organization ID from a request body, query string, cookie, or client-side state without authorization verification.
- Allow a user to access another tenant's data by changing a URL or record ID.
- Filter organization-owned data only in the UI.
- Allow a child record to be attached to a parent belonging to another organization.
- Assume that belonging to one organization implies access to every organization.
- Give all A-Group users portfolio-wide access by default.
- Treat an external customer belonging to a tenant as a member of that tenant's administration team.

### How to implement

- Inspect existing data models and identify which records require organization ownership.
- Document the distinction between platform tenant, tenant membership, tenant-owned customer, and A-Group portfolio administration.
- Define reusable server-side organization-context and authorization helpers.
- Require organization-scoped queries in repositories or service functions rather than relying on every individual route author to remember filtering.
- Validate ownership of related records when creating or updating relationships.
- Evaluate database constraints and indexes that reinforce tenant ownership.
- Consider PostgreSQL row-level security only as a separately designed, tested defense-in-depth measure; do not assume it is enabled or correctly configured.
- Test access attempts using guessed IDs, modified filters, alternate organization IDs, nested relationships, exports, and aggregate endpoints.

### Acceptance criteria

- A user from Organization A cannot access Organization B's records through any protected route or API.
- Changing a record ID or organization parameter cannot bypass authorization.
- Cross-organization relationships are rejected.
- Portfolio-wide access requires explicit authorization and is auditable.

---

## Feature 4: Roles and Permission Model

### What it must do

Support a documented permission model with at least these roles:

- **Admin:** manages authorized organization settings, memberships, invitations, and administrative functions.
- **Finance:** manages and reviews permitted financial, billing, transaction, and budget records.
- **Analyst:** views authorized analytics and reports without unrestricted financial or administrative write access.
- **Read-only:** views permitted information without creating, updating, deleting, or exporting data unless a specific export permission is explicitly granted.

The system must:

- Define permissions by action and resource, not merely by page.
- Support separate permissions for reading, creating, updating, deleting, exporting, inviting users, changing roles, and viewing sensitive financial details.
- Scope permissions to the active organization.
- Support server-side permission checks for every protected operation.
- Provide safe handling when a role is missing, invalid, or no longer permitted.
- Make the current user's access level understandable in the interface.
- Permit future extension of the role model without rewriting every route.

### What it must not do

- Rely solely on client-side role checks.
- Assume an organization Admin is automatically a global A-Group administrator.
- Grant more permissions when an unknown role value is encountered.
- Allow users to modify their own role through an unprotected endpoint.
- Give Read-only users write access through a direct API request.
- Allow an Analyst to export sensitive information simply because they can view a summary.
- Use role names as a substitute for checking tenant membership.

### How to implement

- Define a centralized permission matrix covering resources and actions.
- Create reusable server-side helpers such as `requireUser`, `requireOrganizationMembership`, and `requirePermission`, adapted to the existing codebase.
- Keep role resolution on the trusted server side.
- Check permissions before querying sensitive data or performing mutations.
- Return HTTP 401 for unauthenticated requests and HTTP 403 for authenticated users lacking permission, when resource-disclosure considerations permit that distinction.
- Use consistent error response formats.
- Add tests for every role across representative read, write, export, and administrative actions.

### Acceptance criteria

- All four roles have documented, testable permissions.
- Direct API requests cannot bypass role restrictions.
- Unknown or invalid roles are denied by default.
- Organization-level and portfolio-level administrative powers remain distinct.

---

## Feature 5: Organization Memberships and Invitations

### What it must do

- Allow authorized administrators to invite users to a specific organization.
- Associate each invitation with the intended organization, invited identity or email, assigned role, expiry policy, and current status.
- Support pending, accepted, expired, revoked, and failed invitation states where applicable.
- Validate invitation acceptance against the intended recipient and current invitation status.
- Prevent duplicate or conflicting active invitations according to a documented policy.
- Allow authorized administrators to revoke invitations.
- Support membership removal and role changes with appropriate authorization and audit history.
- Prevent removal or demotion of the last required administrator unless a safe replacement or recovery workflow exists.
- Define onboarding for users who already have a Clerk account.

### What it must not do

- Grant membership merely because a user knows an organization ID.
- Accept an expired or revoked invitation.
- Allow an invitee to change the assigned organization or role during acceptance.
- Allow a normal member to invite users or change roles without permission.
- Expose valid invitation tokens in logs or public error messages.
- Leave an organization without a recoverable administrative path.

### How to implement

- Define invitation and membership lifecycle states.
- Store invitation secrets securely, preferably as hashes when a custom token mechanism is required.
- Use Clerk-supported invitation capabilities where suitable, while retaining authoritative application membership and permission checks.
- Make invitation acceptance and membership creation safe against duplicate requests and race conditions.
- Apply expiry, revocation, recipient validation, and idempotency checks.
- Record important invitation and membership changes.
- Test expired, revoked, duplicate, incorrect-recipient, unauthorized, and concurrently accepted invitations.

### Acceptance criteria

- Only authorized administrators can invite members or change membership roles.
- Invitations cannot grant access outside their intended organization.
- Expired and revoked invitations are rejected.
- Membership changes take effect in authorization checks without requiring a new account.

---

## Feature 6: A-Group Portfolio and Cross-Organization Administration

### What it must do

- Support the approved distinction between external tenant organizations and A-Group-owned products or business units.
- Allow portfolio-wide dashboards and reporting only for explicitly authorized A-Group users.
- Keep each tenant's private records isolated from other tenants.
- Define which metrics can be aggregated across organizations and which require additional privacy or permission checks.
- Label portfolio-wide views clearly.
- Log privileged portfolio access and relevant administrative actions.
- Prevent tenant administrators from obtaining portfolio-wide access.

### What it must not do

- Give all organization administrators global access.
- Mix data from unrelated organizations into tenant-facing reports.
- Treat an A-Group product or business unit as equivalent to a customer organization without a documented relationship.
- Expose individual customer details in portfolio summaries when only aggregate information is permitted.
- Use a hardcoded email allowlist as the only long-term authorization mechanism.

### How to implement

- Define explicit portfolio-level permissions distinct from tenant roles.
- Document the ownership and visibility model for A-Group-owned business units and external organizations.
- Enforce privileged access on the server and in aggregate queries.
- Require a verified authorization path for portfolio-wide data.
- Audit privileged operations and test tenant-to-portfolio escalation attempts.

### Acceptance criteria

- Tenant users see only authorized tenant information.
- Portfolio-wide access is explicitly granted and auditable.
- Portfolio summaries use the approved aggregation and visibility rules.

---

## Feature 7: Protected Browser Pages and API Routes

### What it must do

- Protect dashboard pages, administrative screens, and sensitive application routes.
- Protect every API endpoint that reads or changes private data.
- Apply authentication, account-status, membership, and permission checks in the correct order.
- Validate input and organization scope before performing mutations.
- Use consistent JSON error responses for APIs.
- Keep explicitly public endpoints limited to approved health checks or other documented functions.
- Prevent protected information from leaking through error messages, redirects, page metadata, or cached responses.
- Ensure direct requests receive the same authorization protections as ordinary UI navigation.

### What it must not do

- Assume middleware alone is sufficient for every authorization decision.
- Leave legacy endpoints public after the new authentication flow is introduced.
- Trust the UI to prevent unauthorized requests.
- Return sensitive database errors or stack traces to clients.
- Cache private organization-specific responses in a way that exposes them to another user or tenant.
- Return HTTP 200 for unauthorized API operations.

### How to implement

- Inventory every existing page, route handler, server action, and API endpoint.
- Classify routes as public, authenticated, organization-scoped, role-restricted, or portfolio-restricted.
- Centralize reusable authorization and error-handling logic.
- Protect server actions and background entry points as well as route handlers.
- Review caching and rendering behavior for private, personalized data.
- Add tests for anonymous access, expired sessions, disabled users, insufficient permissions, and cross-organization requests.

### Acceptance criteria

- Every private route has an explicit access policy.
- Protected APIs reject anonymous requests.
- Unauthorized requests do not leak protected data.
- Legacy endpoints and alternate entry points receive equivalent protection.

---

## Feature 8: Clerk Webhook Synchronization

### What it must do

- Process approved Clerk webhook events needed to synchronize local user records.
- Verify webhook signatures using the correct configured signing secret.
- Handle user creation, user updates, and user deletion or disablement according to the documented lifecycle.
- Be safe when events are delivered more than once or arrive out of order.
- Record processing outcomes and provide a controlled recovery path for failures.
- Keep webhook processing consistent with local account status and authorization policy.
- Ensure webhook endpoints do not grant access based on unverified request bodies.

### What it must not do

- Trust an incoming webhook without signature verification.
- Expose webhook signing secrets.
- Create duplicate local users from repeated events.
- Allow an older event to unintentionally reverse a newer account state.
- Return success for an event that has not been durably accepted or processed according to the documented processing model.
- Let webhook processing delete business or financial records.

### How to implement

- Use the official supported webhook verification mechanism and the appropriate SDK.
- Store the webhook signing secret only in server-side environment configuration.
- Design an idempotent event-processing workflow.
- Use provider event identifiers where available to prevent duplicate processing.
- Define retry, failure, and out-of-order event handling.
- Keep account disablement separate from business-record deletion.
- Test invalid signatures, duplicate events, missing users, retry scenarios, and relevant event-ordering cases.

### Acceptance criteria

- Invalid webhook signatures are rejected.
- Repeated events do not create duplicate users or unintended state changes.
- User deactivation follows the documented synchronization policy.
- Webhook failures are observable without leaking secrets.

---

## Feature 9: Input Validation and Safe Error Handling

### What it must do

- Validate request bodies, query parameters, route parameters, and relevant headers on the server.
- Validate record ownership and relationships before writes.
- Reject invalid amounts, dates, statuses, currencies, identifiers, and enum values.
- Apply appropriate size limits to text fields, uploaded content if introduced, and bulk operations.
- Use safe parameterized database access patterns.
- Return consistent errors that help authorized users correct invalid input without exposing sensitive internals.
- Distinguish validation errors, authentication failures, authorization failures, conflicts, missing records, and unexpected server errors.
- Validate imported CSV content and bulk updates where supported.

### What it must not do

- Trust TypeScript types as runtime validation.
- Assume client-side validation protects server APIs.
- Return stack traces, SQL errors, tokens, or secrets to the browser.
- accept invalid organization relationships because each individual identifier is syntactically valid.
- Convert unexpected failures into false success responses.
- Silently discard invalid rows during imports without reporting what happened.

### How to implement

- Review existing validation libraries and use a consistent schema-validation approach.
- Validate inputs at the API boundary and enforce domain rules in shared service functions.
- Use database constraints as an additional safeguard.
- Define a standard error response format and safe logging policy.
- Add tests for malformed input, invalid relationships, oversized requests, unexpected failures, and conflicting updates.

### Acceptance criteria

- Invalid requests are rejected consistently.
- API responses do not disclose sensitive internal implementation details.
- Domain rules are enforced regardless of whether requests originate from the UI, scripts, or direct HTTP clients.

---

## Feature 10: Data Integrity and Referential Consistency

### What it must do

- Preserve valid relationships between organizations, users, memberships, customers, products, subscriptions, invoices, payments, transactions, budgets, and financial accounts.
- Enforce required fields, valid statuses, unique identifiers, and appropriate relationship constraints.
- Prevent cross-organization references.
- Define safe deletion and deactivation behavior for records with financial or historical dependencies.
- Preserve historical records needed for audit and reporting.
- Make migrations and data changes reproducible and reviewable.
- Ensure database constraints and application validation reinforce one another.

### What it must not do

- Delete historical financial records as a side effect of removing a user or subscription.
- Allow orphaned or cross-tenant relationships.
- Assume frontend validation protects referential integrity.
- Apply destructive schema changes without an explicit migration and recovery plan.
- Introduce schema changes without updating tests and seed data.

### How to implement

- Inspect existing Prisma models and identify relationship, uniqueness, and tenant-scope gaps.
- Document schema changes before implementation.
- Define delete, archive, disable, and cascade behavior for each important relationship.
- Use database foreign keys and constraints where appropriate.
- Plan schema migrations, existing-data backfills, rollback or recovery options, and test fixtures together.
- Test deletion and update behavior for financial history and organization ownership.

### Acceptance criteria

- Required relationships remain valid.
- Cross-organization references are rejected.
- Historical financial data survives appropriate user and account lifecycle changes.
- Schema changes have reviewed migration and test plans.

---

## Feature 11: Security Audit Trail

### What it must do

- Record important security and administrative events, including relevant sign-ins or access events where supported, membership changes, role changes, invitation activity, account disablement, privileged portfolio access, and sensitive financial mutations.
- Capture relevant actor, action, target, organization scope, timestamp, outcome, and safe contextual metadata.
- Restrict access to audit records.
- Preserve sufficient history to investigate unauthorized or unexpected changes.
- Define retention and export rules appropriate to the application's needs.
- Distinguish an audit event from ordinary application debug logging.

### What it must not do

- Store passwords, session tokens, secret keys, full authorization headers, or webhook signing secrets in audit logs.
- Allow ordinary users to alter or erase audit records without authorization and traceability.
- Record unnecessary sensitive customer information.
- Claim the audit trail is tamper-proof unless the architecture actually provides that property.
- Allow audit queries to bypass organization isolation.

### How to implement

- Define an audit-event schema and a documented list of auditable actions.
- Use centralized server-side audit helpers for important mutations and privileged access.
- Write audit events in a reliable relationship to the operation being recorded.
- Apply access controls and retention policy.
- Test event completeness, sensitive-value redaction, authorization, and failure behavior.

### Acceptance criteria

- Important administrative and financial mutations are traceable.
- Audit records do not contain secrets.
- Audit access is restricted and tenant scope is enforced where applicable.

---

## Feature 12: Session and Account Security

### What it must do

- Respect Clerk's supported session expiration and revocation behavior.
- Require valid authentication for protected requests.
- Handle sign-out, expired sessions, disabled accounts, and removed organization memberships.
- Ensure membership and permission changes take effect according to a documented authorization-cache policy.
- Provide safe recovery behavior when the identity provider or session service is unavailable.
- Keep private session state out of public browser storage where it does not belong.

### What it must not do

- Trust stale role or membership information indefinitely.
- Keep a disabled user's application access active because an old page remains open.
- expose session tokens in URLs or logs.
- invent custom session cryptography when Clerk already provides the required capability.
- Treat an identity-provider outage as permission to allow unauthenticated access.

### How to implement

- Use supported Clerk session mechanisms rather than custom authentication primitives.
- Define when organization membership and permission data is refreshed.
- Check current account and authorization state on protected server operations.
- Handle unavailable identity services safely.
- Test expired sessions, sign-out, account disablement, and membership removal.

### Acceptance criteria

- Expired or revoked sessions cannot perform protected operations.
- Disabled users and removed members lose access according to the documented policy.
- Authentication-service failures do not fail open.

---

## Feature 13: Rate Limiting and Abuse Resistance

### What it must do

- Identify sensitive endpoints that need rate limits, such as invitation creation, login-adjacent workflows, exports, bulk mutations, and expensive analytics.
- Apply limits appropriate to the deployment environment and endpoint risk.
- Return controlled responses when limits are exceeded.
- Protect against repeated or abusive operations that could create excessive database load or duplicate records.
- Document any shared storage or distributed coordination required for production rate limiting.

### What it must not do

- Rely exclusively on in-memory counters when production requests can reach multiple instances.
- expose internal infrastructure details through rate-limit errors.
- impose limits that unintentionally make ordinary authorized work unusable.
- treat rate limiting as a substitute for authentication and authorization.

### How to implement

- Inventory endpoints and classify their abuse and resource risks.
- Select a rate-limiting strategy compatible with the deployment platform.
- Define limits and identifiers carefully, considering authenticated user, organization, and network information as appropriate.
- Ensure sensitive identifiers are not unnecessarily exposed in logs.
- Test threshold behavior, concurrent requests, and production deployment assumptions.

### Acceptance criteria

- High-risk endpoints have documented protection.
- Limits work under the expected deployment model.
- Exceeding a limit does not bypass authorization or corrupt data.

---

## Feature 14: Security Configuration and Secret Management

### What it must do

- Document required environment variables for Clerk, PostgreSQL, webhook verification, and other approved integrations.
- Provide a safe `.env.example` containing variable names and non-secret placeholders only.
- Validate required configuration at startup or at the relevant feature boundary.
- Separate local, preview, and production credentials.
- Ensure production secrets are configured through the deployment platform's secret-management facilities.
- Document key rotation and incident response steps.
- Ensure missing required security configuration produces a safe, clear failure.

### What it must not do

- Commit real credentials, tokens, private keys, or database passwords.
- print full secret values in logs or error messages.
- expose server-only environment variables through client bundles.
- silently disable authentication or webhook verification when configuration is missing.
- reuse production credentials in demo fixtures or public documentation.

### How to implement

- Audit existing environment-variable usage and repository history as appropriate.
- Define the exact environment-variable names and which runtime needs each value.
- Keep public Clerk configuration separate from server-side secrets.
- Validate configuration without printing its values.
- Document secure setup, rotation, and recovery procedures.
- Coordinate secret requirements with Category 5's deployment configuration.

### Acceptance criteria

- `.env.example` contains no actual secrets.
- Missing required production security configuration causes a safe failure.
- Secret values are not exposed in source code, client bundles, logs, or public errors.

---

## Feature 15: Security Testing and Regression Prevention

### What it must do

- Test authentication, authorization, tenant isolation, invitation workflows, webhook verification, and input validation.
- Include direct API requests that bypass the UI.
- Test every role against representative permitted and forbidden operations.
- Test manipulated organization IDs, record IDs, filters, and nested record relationships.
- Verify that disabled users and removed members cannot continue performing protected operations.
- Test database constraints and migration behavior for tenant-owned records.
- Include security checks in the automated validation and deployment workflow where practical.

### What it must not do

- Treat a successful production build as proof of security.
- Test only the happy path.
- Use real customer secrets or production data in automated tests.
- Ignore authorization failures because the interface hides the affected controls.
- Disable security tests to make deployment pass without documented review.

### How to implement

- Create a security test matrix covering roles, resources, organizations, and actions.
- Use isolated test data and test credentials.
- Add integration tests for protected API endpoints and tenant isolation.
- Include webhook signature tests and duplicate-event tests.
- Verify that test failures stop the relevant validation or deployment stage.
- Record unresolved security limitations explicitly.

### Acceptance criteria

- Tests demonstrate that forbidden operations fail.
- Tenant isolation is verified through direct API calls.
- Authentication and authorization regressions are detectable before release.

---

## Feature 16: Security Incident and Recovery Readiness

### What it must do

- Document how to disable a compromised or unauthorized user.
- Define how to rotate exposed Clerk, database, and webhook credentials.
- Provide a procedure for revoking inappropriate organization memberships and invitations.
- Define how to investigate relevant audit records.
- Coordinate database recovery and incident response with Category 5.
- Identify who is authorized to perform emergency administrative actions.

### What it must not do

- Expose emergency administrative credentials in documentation or source code.
- create an undocumented bypass around normal authorization.
- claim to have detected or contained an incident without evidence.
- delete audit history as part of incident cleanup.

### How to implement

- Write a concise incident-response runbook.
- Document credential rotation and account-disablement procedures.
- Define access-controlled recovery steps and required audit events.
- Test recovery procedures in a non-production environment where feasible.

### Acceptance criteria

- Administrators have a documented and controlled response to compromised accounts or secrets.
- Recovery steps do not require a public or hardcoded security bypass.
- Incident-related actions remain traceable.

---

## Cross-category dependencies

### Category 1 — Dashboard Experience & Interface
- Protected page behavior.
- Sign-in and sign-out navigation.
- Role-aware navigation and controls.
- Safe access-denied, loading, and session-expired states.
- UI elements that clearly reflect permissions without replacing server-side enforcement.

### Category 2 — Organizations, Customers & Subscription Operations
- Organization, user, membership, invitation, customer, product, subscription, invoice, payment, and transaction relationships.
- Organization ownership for every tenant-owned record.
- Membership lifecycle and role assignments.
- Safe deletion, deactivation, and financial-history preservation.

### Category 3 — Finance, Analytics & Reporting
- Server-side authorization for financial calculations, reports, exports, and drill-downs.
- Tenant-scoped aggregation and transaction access.
- Audit requirements for financial changes.
- Protection against exposing private financial data in errors or logs.

### Category 5 — Infrastructure, Deployment & Product Reliability
- Secure environment configuration and production secrets.
- Compatible Clerk, Next.js, Prisma, PostgreSQL, and deployment versions.
- Webhook endpoint reliability and monitoring.
- Rate limiting, logging, backup, recovery, and deployment validation.
- Production HTTPS and safe configuration of trusted origins and callback URLs.

Do not duplicate the implementation responsibilities of other categories. Document interfaces, prerequisites, and unresolved decisions.

## Implementation phases

### Phase 1 — Authentication foundation
- Validate the selected Clerk integration and deployment compatibility.
- Define user identity and account status.
- Protect browser pages and API endpoints.
- Add initial authentication tests.

### Phase 2 — Organization isolation and permissions
- Define the local organization membership model.
- Establish tenant-scoped query helpers and role checks.
- Define Admin, Finance, Analyst, and Read-only permissions.
- Test direct API access and cross-organization isolation.

### Phase 3 — Invitations and identity synchronization
- Implement the approved invitation and membership lifecycle.
- Verify Clerk webhooks.
- Make user synchronization idempotent.
- Test account disablement, retries, and membership changes.

### Phase 4 — Data integrity and auditability
- Review schema constraints and relationships.
- Define safe deletion and historical-record policies.
- Add audit events, validation, and secure error handling.
- Test migrations and data integrity.

### Phase 5 — Hardening and operational readiness
- Add rate limiting to selected sensitive endpoints.
- Validate production secret configuration.
- Complete the security regression matrix.
- Document incident response and recovery.

These phases control implementation order only. All required features must remain in the specification.

## Definition of done

Category 4 is complete only when:

- [ ] Clerk authentication works with the approved application and deployment versions.
- [ ] Private browser pages and APIs are protected independently.
- [ ] Anonymous protected API requests return HTTP 401 with a safe response.
- [ ] Authenticated users without the required permission receive an appropriate denial.
- [ ] Disabled users cannot access protected application data.
- [ ] Admin, Finance, Analyst, and Read-only permissions are documented and tested.
- [ ] Organization memberships and invitations cannot grant unauthorized access.
- [ ] Tenant isolation applies to every protected query, mutation, aggregate, report, and export.
- [ ] Cross-organization record relationships are rejected.
- [ ] Portfolio-wide access requires explicit authorization.
- [ ] Clerk webhook signatures are verified and duplicate events are handled safely.
- [ ] Important administrative and financial changes are traceable.
- [ ] Input validation and database constraints protect data integrity.
- [ ] Secrets are excluded from source code, browser bundles, logs, and public errors.
- [ ] Rate limits and operational security requirements are documented for production.
- [ ] Automated security tests cover direct API requests and cross-organization attacks.
- [ ] Incident response and credential rotation procedures are documented.
- [ ] No production authentication bypass or hardcoded privileged account exists.

## Instructions for this documentation task

First inspect `plans/product-scope.md`, the Category 1, Category 2, and Category 3 specification files, the existing Prisma schema, the current route handlers, and the existing authentication-related configuration.

If an expected document or implementation is missing, report it rather than inventing its contents. Clearly distinguish existing verified behavior from planned behavior.

Create or update only:

`plans/category-4-authentication-permissions-data-integrity.md`

Do not implement authentication, modify application code, change the database schema, run migrations, alter dependencies, change deployment configuration, commit, or push.

When finished, report:
1. The exact file created or updated.
2. The features and sections documented.
3. Any conflicts with existing specifications, routes, schema, or dependencies.
4. Any missing prerequisites and unresolved security decisions.
5. Confirmation that no application code, database schema, or deployment configuration was changed.