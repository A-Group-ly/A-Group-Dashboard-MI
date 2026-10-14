# Category 5: Infrastructure, Deployment & Product Reliability

## Objective

Establish a reliable deployment and operational foundation for the A-Group Subscription Dashboard.

The application must be deployable using the approved hosting architecture, connect securely to Neon PostgreSQL, integrate with Clerk authentication, manage environment configuration safely, validate changes through automated checks, and provide appropriate monitoring, backup, recovery, and error-handling procedures.

The existing stack includes Next.js, React, TypeScript, Tailwind CSS, Prisma, and PostgreSQL. Before choosing deployment adapters or upgrading packages, inspect the actual repository and validate compatibility with the target runtime.

The final deliverable must include a working deployed application, a verified database connection, protected application routes, documented setup instructions, and a repeatable deployment process.

This category integrates with:

- Category 1 — Dashboard Experience & Interface.
- Category 2 — Organizations, Customers & Subscription Operations.
- Category 3 — Finance, Analytics & Reporting.
- Category 4 — Authentication, Permissions & Data Integrity.

All features in this category remain in scope even if implementation must be phased.

## Global infrastructure rules

1. Inspect the actual repository, installed package versions, existing deployment files, and application routes before changing infrastructure.
2. Validate framework, runtime, adapter, Prisma, database driver, and authentication compatibility using a minimal working deployment proof before committing to a production architecture.
3. Use Neon PostgreSQL as the hosted database, subject to the selected plan's limits and the project's requirements.
4. Deploy to Cloudflare only after verifying that the selected Cloudflare runtime and adapter support the required application features.
5. Do not assume that a deployment adapter, Prisma version, database driver, or runtime is compatible merely because documentation describes a similar combination.
6. Keep development, preview, and production environments separated.
7. Never commit secrets, database passwords, authentication keys, webhook signing secrets, or production credentials.
8. Use migrations and reviewed schema changes rather than manually changing production tables.
9. Never seed production with demo data automatically.
10. Clearly distinguish demo records from actual business records.
11. Do not expose private organization data through caching, logs, error pages, public endpoints, or improperly configured environment variables.
12. Use least-privilege credentials wherever the provider and application architecture support them.
13. Treat deployment success as insufficient until database access, authentication, authorization, and core user workflows have been verified.
14. Avoid unnecessary dependency upgrades or architecture changes that jeopardize existing functionality.
15. Do not introduce real payment processing or money movement without separate explicit authorization.
16. Document limitations, free-tier constraints, operational risks, and recovery procedures honestly.

---

## Feature 1: Deployment Architecture and Compatibility Validation

### What it must do

- Identify the current Next.js version, React version, Prisma version, Node.js requirements, and existing build configuration.
- Determine the supported deployment approach for the target Cloudflare environment.
- Validate compatibility between the Next.js application, Cloudflare adapter or runtime, Prisma client, PostgreSQL connectivity, Clerk, and required application features.
- Identify runtime limitations affecting server-side rendering, route handlers, server actions, background work, caching, or other used capabilities.
- Produce a reproducible build and deployment configuration.
- Document the final architecture and the reasons for choosing it.
- Preserve existing working functionality wherever possible.

### What it must not do

- Assume a deployment adapter works with the existing stack without testing.
- Blindly pin old adapter versions or upgrade every package to its latest version.
- replace working application architecture simply because a newer framework or adapter exists.
- claim compatibility based solely on a successful local development server.
- introduce an untested runtime or database driver into production.
- remove application features to make deployment easier without documenting the impact and obtaining approval.

### How to implement

- Inspect `package.json`, the lockfile, Next.js configuration, Prisma schema, generated client configuration, route handlers, and existing build scripts.
- Review current official documentation for Cloudflare, Next.js, Prisma, Neon, and Clerk.
- Build a minimal compatibility proof using the proposed deployment target.
- Verify a server-side Prisma query against a non-production Neon database.
- Verify one protected API route using Clerk.
- Verify production build and runtime behavior for the features the application actually uses.
- Record exact tested versions, required configuration, known limitations, and unresolved risks.
- Select the architecture only after the proof passes.

### Acceptance criteria

- The deployment architecture and dependency versions are documented.
- The selected runtime supports the required application behavior.
- A deployed proof can query Neon PostgreSQL and enforce authentication.
- Known incompatibilities have a documented resolution before production launch.

---

## Feature 2: Neon PostgreSQL Configuration

### What it must do

- Use Neon PostgreSQL as the hosted relational database.
- Configure the database connection through environment variables.
- Support separate development, preview, and production database configurations where the hosting setup permits.
- Use the correct connection mode for the application runtime and database workload.
- Support secure TLS connections.
- Document connection pooling and connection limits.
- Validate database connectivity through a safe health check.
- Preserve existing data and schema integrity when connecting the application.
- Document Neon plan limits and relevant operational constraints.

### What it must not do

- hardcode a database URL or password into application source code.
- expose database credentials to browser code.
- print the full database URL in logs or health-check responses.
- assume pooled and direct connection URLs are interchangeable for every operation.
- assume a particular Prisma and Neon configuration works without testing it.
- use production credentials in development or automated tests.
- allow public health endpoints to disclose database hostnames, credentials, schema details, or sensitive connection errors.

### How to implement

- Create documented environment-variable requirements, including the appropriate database connection variable names.
- Use Neon-provided connection details and TLS requirements.
- Verify the connection strategy against the selected Prisma version and Cloudflare runtime.
- Separate normal application queries from migration operations if the architecture requires different connection handling.
- Configure connection pooling only after validating compatibility.
- Implement a minimal database query for readiness verification.
- Test invalid credentials, unavailable database connections, and recovery after temporary failures.
- Document safe database credential rotation.

### Acceptance criteria

- The deployed application can query the intended Neon database.
- Database credentials are stored only in appropriate secret configuration.
- Health checks reveal availability without exposing connection details.
- Connection behavior is validated under the selected runtime and plan constraints.

---

## Feature 3: Prisma Schema and Database Migrations

### What it must do

- Keep the Prisma schema consistent with the approved product specifications.
- Use version-controlled migrations for schema changes.
- Validate migrations in development or preview environments before production.
- Define how initial setup, future upgrades, and recovery are performed.
- Ensure new organization, user, membership, customer, subscription, financial, and audit relationships are reflected correctly as their implementation phases progress.
- Preserve required historical financial and operational records.
- Document migration prerequisites and known data-backfill requirements.
- Make schema validation and migration checks part of the development workflow.

### What it must not do

- apply unreviewed destructive schema changes directly to production.
- use development-only schema-push workflows as the normal production migration process.
- automatically erase existing data to resolve migration conflicts.
- assume a migration is safe merely because it succeeds on an empty database.
- seed production with demo organizations, customers, payments, or transactions.
- introduce a schema migration without corresponding application updates and tests.

### How to implement

- Inspect the existing Prisma schema and migration history.
- Review the product specifications for tenant ownership, identity, financial integrity, and audit requirements.
- Document schema changes before implementing them.
- Generate migrations through the supported Prisma workflow.
- Test migrations against representative non-production data.
- Review destructive changes, indexes, constraints, and data backfills.
- Define the production migration command and the appropriate deployment stage.
- Keep migration credentials and privileges separate where supported by the chosen database architecture.

### Acceptance criteria

- The schema can be validated reproducibly.
- Required migrations are version-controlled and tested.
- Production migrations have a documented execution and recovery plan.
- Existing financial and business records are not silently destroyed.

---

## Feature 4: Environment Configuration and Secret Management

### What it must do

- Maintain a safe `.env.example` that lists required environment variables without real secrets.
- Document the purpose and runtime exposure of each variable.
- Separate local development, preview, and production configuration.
- Configure Clerk keys, Neon connection strings, webhook secrets, and other approved integration credentials securely.
- Validate required configuration at startup or when the associated feature is initialized.
- Ensure server-only secrets remain on the server.
- Document credential rotation and incident-response steps.
- Make configuration errors clear without exposing secret values.

### What it must not do

- commit `.env` files containing real credentials.
- put database URLs, Clerk secret keys, or webhook signing secrets into client-side variables.
- print secrets in logs or error messages.
- silently disable authentication when a production variable is missing.
- reuse production credentials in public examples, demo fixtures, or tests.
- include real passwords or API tokens in screenshots or documentation.

### How to implement

- Inspect current environment-variable usage and repository ignore rules.
- Define a documented list of required and optional variables.
- Use non-secret placeholders in `.env.example`.
- Configure deployment secrets through the hosting platform's supported secret-management facilities.
- Validate configuration names and presence without logging values.
- Review source code for accidental secret exposure.
- Document safe setup, rotation, and recovery procedures.

### Acceptance criteria

- `.env.example` contains no actual credentials.
- Production secrets are configured through the appropriate deployment settings.
- Client bundles and public responses contain no server-only secrets.
- Missing required security configuration causes a safe, explicit failure.

---

## Feature 5: Cloudflare Deployment and Custom Domain

### What it must do

- Deploy the application to the approved Cloudflare environment using the validated architecture.
- Configure production build and runtime settings.
- Configure required environment variables and secrets.
- Provide a stable deployment URL.
- Configure a custom domain if one is available and approved.
- Ensure HTTPS is enabled.
- Verify protected pages, APIs, static assets, and server-side database access.
- Document deployment, rollback, and redeployment procedures.
- Ensure the deployed application uses the intended production database and authentication configuration.

### What it must not do

- claim the application is deployed before verifying the actual live URL.
- expose preview credentials or production secrets in build logs.
- deploy untested migrations or incompatible runtime changes directly to production.
- disable authentication or authorization to work around deployment errors.
- assume every Next.js feature is supported by the chosen Cloudflare configuration.
- use demo database records as evidence of production financial performance.

### How to implement

- Use the architecture validated in Feature 1.
- Configure the required Cloudflare project, runtime compatibility settings, build command, and output configuration.
- Deploy to a preview environment before production where practical.
- Configure Clerk's production origins and callback URLs according to the selected authentication setup.
- Configure the production Neon connection securely.
- Verify the deployed health endpoint and database readiness.
- Test sign-in, protected pages, protected APIs, organization isolation, and core dashboard flows.
- Record the actual deployment URL and deployment instructions.
- Document rollback and recovery steps.

### Acceptance criteria

- A real deployed URL is available and verified.
- HTTPS works.
- The deployed application can access the correct Neon database.
- Clerk authentication and protected routes work in the deployed environment.
- No production secrets are exposed publicly.

---

## Feature 6: CI/CD and Automated Quality Gates

### What it must do

- Provide a repeatable automated validation process for changes.
- Run appropriate dependency, type, lint, test, and production-build checks.
- Validate Prisma schema and migration consistency.
- Prevent known failing checks from being silently ignored.
- Support deployment previews or another controlled validation environment where available.
- Ensure production deployment follows the approved branch and validation policy.
- Keep credentials and deployment permissions scoped appropriately.
- Provide understandable failure logs without exposing secrets.

### What it must not do

- deploy known failing builds without explicit documented approval.
- use production database credentials in untrusted pull-request workflows.
- expose secrets to untrusted workflow execution.
- skip security or tenant-isolation tests merely to make CI pass.
- claim tests pass if they were not actually run.
- automatically apply destructive migrations without a reviewed process.

### How to implement

- Inspect existing GitHub repository configuration and scripts.
- Reuse existing lint, test, schema, and build commands where suitable.
- Add or update CI workflows only after validating the repository's actual commands and requirements.
- Separate validation jobs from privileged production deployment jobs.
- Use repository or environment secrets through the supported CI platform.
- Define required checks and a clear deployment trigger.
- Test the workflow using a controlled change.
- Document which checks are automated and which remain manual.

### Acceptance criteria

- The documented CI process can be reproduced.
- Required checks run before production deployment.
- Untrusted workflows cannot access production secrets.
- Deployment status and failures are visible.

---

## Feature 7: Health Checks, Readiness and Runtime Diagnostics

### What it must do

- Provide a minimal health endpoint indicating whether the application runtime is responding.
- Provide an appropriate readiness check for critical dependencies such as PostgreSQL where required.
- Distinguish application liveness from dependency readiness.
- Return safe, consistent status codes and response bodies.
- Support monitoring of database connectivity and essential runtime failures.
- Keep detailed diagnostics available only through authorized operational channels.
- Document which dependencies each health check validates.

### What it must not do

- expose database credentials, connection strings, internal stack traces, or private environment details.
- report full application readiness when a critical dependency is unavailable.
- perform expensive database operations on every liveness request.
- make health endpoints an alternative way to retrieve protected dashboard data.
- report a deployment as healthy solely because static files load.

### How to implement

- Inspect the existing `/api/health` endpoint and its behavior.
- Define whether liveness and readiness need separate endpoints.
- Use a minimal database query for readiness where appropriate.
- Set appropriate timeouts and handle database failures safely.
- Avoid returning detailed internal diagnostics publicly.
- Test healthy, unavailable, and slow dependency scenarios.
- Ensure operational monitoring can distinguish application failure from dependency failure.

### Acceptance criteria

- Health checks report accurate and safe status.
- Database readiness is verified separately where needed.
- Public health responses do not expose sensitive configuration.
- Monitoring can detect essential service failures.

---

## Feature 8: Logging, Monitoring and Error Reporting

### What it must do

- Capture actionable application errors and important operational events.
- Use structured logging where supported.
- Record useful context such as operation, route, timestamp, and correlation identifier.
- Monitor database connectivity, failed requests, deployment failures, and key application errors.
- Distinguish expected validation or authorization failures from unexpected server failures.
- Provide a process for reviewing and resolving production incidents.
- Redact sensitive fields and avoid collecting unnecessary customer data.
- Make error handling consistent across dashboard pages and APIs.

### What it must not do

- log passwords, database URLs, Clerk secrets, session tokens, or webhook signing secrets.
- expose stack traces or internal configuration to ordinary users.
- log entire request bodies by default when they may contain sensitive data.
- claim to have monitoring or alerting integrations that are not configured.
- treat a successful deployment as proof that no runtime errors exist.

### How to implement

- Review current error-handling and logging behavior.
- Define logging levels and safe contextual fields.
- Establish a common API error response format.
- Use the monitoring facilities available within the approved deployment environment.
- Add external error monitoring only if the provider, privacy requirements, and configuration are approved.
- Define incident severity, triage, and escalation procedures.
- Test that secrets and sensitive values are redacted.

### Acceptance criteria

- Production failures can be investigated using available logs or monitoring.
- Public errors are safe and consistent.
- Sensitive values are not recorded unnecessarily.
- Monitoring capabilities and limitations are documented accurately.

---

## Feature 9: Database Backups and Recovery

### What it must do

- Identify the database backup and restore capabilities available under the selected Neon plan.
- Document retention periods, recovery-point expectations, and recovery-time expectations.
- Define a process for restoring data after accidental deletion, corruption, or a failed migration.
- Preserve required financial and audit history.
- Test restoration or recovery procedures in a non-production environment where practical.
- Document who can initiate recovery and how the recovered database is validated.
- Coordinate recovery with application deployment and schema versions.

### What it must not do

- claim backups exist without verifying the provider's actual configuration and plan.
- assume that a backup is useful without a tested restore process.
- overwrite the only available production data during recovery.
- restore incompatible schema and application versions without a documented reconciliation plan.
- include production database credentials in backup scripts or public documentation.
- claim a particular recovery guarantee that the selected plan does not provide.

### How to implement

- Inspect Neon backup, restore, branching, and recovery features available to the project.
- Document the selected backup and recovery strategy.
- Define the expected recovery point and recovery time, even if initially best-effort.
- Test recovery using a non-production database or supported restore workflow.
- Verify record counts, schema version, tenant relationships, and critical financial totals after recovery.
- Document incident ownership and escalation.

### Acceptance criteria

- Backup and restore capabilities are verified rather than assumed.
- Recovery steps are documented.
- A recovery test or documented provider-supported recovery validation has been completed before relying on the process.
- Critical data-integrity checks are part of recovery validation.

---

## Feature 10: Performance and Resource Management

### What it must do

- Measure and monitor essential page response times, API latency, database query performance, and error rates where tooling permits.
- Avoid unbounded queries and unnecessary database round trips.
- Use pagination and server-side filtering for large record lists.
- Apply appropriate database indexes based on actual query patterns.
- Avoid loading entire financial histories into browser memory.
- Respect serverless or edge-runtime execution limits.
- Identify expensive dashboard aggregations and optimize them when measurement shows a need.
- Document any known free-tier resource limitations.

### What it must not do

- add indexes, caching, or background jobs blindly without evaluating the data model and query behavior.
- cache private tenant-specific results without correct cache isolation.
- sacrifice financial correctness to make metrics faster.
- assume local performance predicts production performance.
- introduce unnecessary infrastructure that exceeds the project budget or maintenance capacity.

### How to implement

- Inspect current API queries, database indexes, and page-loading behavior.
- Establish basic performance baselines using representative demo data.
- Measure the slowest or most expensive queries.
- Apply pagination, indexing, query improvements, and safe caching where justified.
- Validate caching behavior for authenticated and organization-scoped responses.
- Test under the selected deployment runtime and expected data volumes.
- Document remaining performance risks and free-tier constraints.

### Acceptance criteria

- Core dashboard and record-list workflows perform acceptably under representative test data.
- Large lists are paginated or otherwise bounded.
- Private data cannot leak through shared caches.
- Performance claims are based on observed measurements.

---

## Feature 11: Dependency and Supply-Chain Maintenance

### What it must do

- Keep application dependencies and lockfiles consistent.
- Track security advisories affecting important packages.
- Use compatible dependency versions.
- Document required runtime and tooling versions.
- Review changes to Next.js, Prisma, Clerk, Cloudflare adapters, and database-related packages carefully.
- Provide a controlled process for dependency updates and regression testing.

### What it must not do

- upgrade major framework or adapter versions blindly.
- delete the lockfile to work around dependency-resolution problems.
- ignore known high-risk vulnerabilities without documented review.
- install unnecessary packages without a clear need.
- claim a dependency is secure merely because it is the latest release.

### How to implement

- Inspect the lockfile and existing package scripts.
- Identify direct and important transitive dependencies.
- Use available dependency audit tools where suitable.
- Apply targeted updates with compatibility testing.
- Run lint, tests, schema validation, and production builds after changes.
- Document deferred updates and any accepted risk.

### Acceptance criteria

- Dependencies are reproducibly installed.
- Important security and compatibility concerns are documented.
- Updates do not silently break authentication, database access, or deployment.

---

## Feature 12: Demo Data, Seed Operations and Environment Safety

### What it must do

- Provide a repeatable way to create clearly labeled fictional demo data in development or approved demo environments.
- Keep seed data deterministic where practical.
- Include realistic relationships among organizations, customers, products, subscriptions, invoices, payment records, transactions, budgets, and accounts as features become available.
- Ensure demo data exercises normal and edge-case workflows.
- Make it clear in the UI and documentation when demo data is displayed.
- Keep production seeding separate from development seeding.
- Provide a safe reset process for disposable development data.

### What it must not do

- automatically seed demo data into production.
- overwrite or delete existing real data during ordinary application startup.
- represent fictional customers or transactions as actual company activity.
- use actual personal information or secrets in fixtures.
- create fake payment-provider confirmations or imply real money moved.
- bypass authentication or tenant isolation because data is fictional.

### How to implement

- Inspect the current seed script and existing demo data.
- Separate seed, reset, and production migration commands.
- Add explicit safeguards against destructive operations in production.
- Make seed execution repeatable or safely reject repeated execution.
- Document which environments permit seeding.
- Test the seed workflow against an isolated non-production database.

### Acceptance criteria

- Demo data can be created in an approved environment.
- Seed operations cannot silently erase production data.
- Demo records are clearly labeled.
- Demo records follow the same validation and tenant-isolation rules as ordinary records.

---

## Feature 13: Repository, Documentation and Developer Setup

### What it must do

- Maintain a README with prerequisites, local setup, environment configuration, database setup, migration commands, seed instructions, test commands, build commands, and deployment instructions.
- Document the repository structure and key architectural decisions.
- Explain how to create and configure Clerk and Neon resources without exposing credentials.
- Document the actual tested Cloudflare deployment process.
- Explain common setup and troubleshooting failures.
- Maintain `.env.example` without real secrets.
- Document which features are implemented, partially implemented, or still planned.
- Include the verified GitHub repository and live application URL when available.

### What it must not do

- claim that an unverified command works.
- include real database passwords or authentication keys.
- claim every planned feature has been implemented.
- leave critical deployment steps known only to one developer.
- invent a live URL, test result, or repository state.

### How to implement

- Inspect the existing README and project scripts.
- Use the actual repository commands and dependency versions.
- Document local setup from a clean checkout.
- Verify instructions on a fresh environment or clean working copy where practical.
- Update documentation alongside infrastructure changes.
- Record remaining manual configuration steps and account requirements.

### Acceptance criteria

- A developer can follow the README to install dependencies, configure a safe development environment, connect a non-production database, and run the application.
- Deployment instructions match the validated architecture.
- Repository and live URLs are accurate and verified.
- Unimplemented features and known limitations are clearly identified.

---

## Feature 14: Production Security and Release Checklist

### What it must do

- Verify production environment configuration.
- Verify Clerk authentication and protected APIs.
- Verify tenant isolation and role-based authorization.
- Verify Neon connectivity and schema migration status.
- Verify HTTPS and configured authentication origins.
- Verify public health endpoints do not expose sensitive details.
- Verify demo seeding is disabled or appropriately guarded in production.
- Verify that logs and error responses do not leak secrets.
- Confirm deployment rollback and database recovery procedures.
- Provide a final checklist and evidence of the checks performed.

### What it must not do

- mark a checklist item complete without evidence.
- deploy with known critical authentication or tenant-isolation failures.
- use real sensitive company data before authorization and isolation have been verified.
- claim a security review is complete merely because the app builds.
- ignore known production blockers to meet a deadline.

### How to implement

- Create a repeatable release checklist.
- Run automated tests and production build checks.
- Verify deployment health and database connectivity.
- Test unauthenticated and unauthorized access.
- Test cross-organization access denial.
- Verify environment configuration and secret handling.
- Record actual results, unresolved issues, and release approval.

### Acceptance criteria

- The release checklist reflects actual verified behavior.
- Critical authentication, authorization, and database failures block release.
- Unresolved risks are visible and explicitly accepted or fixed before production use.

---

## Feature 15: Deployment Rollback and Operational Recovery

### What it must do

- Document how to roll back a faulty application deployment.
- Explain the relationship between application rollback and database schema changes.
- Preserve logs and evidence needed to diagnose a failed release.
- Define how to disable a problematic feature or deployment when necessary.
- Provide a recovery procedure for broken configuration, unavailable database access, or failed migrations.
- Coordinate rollback procedures with the backup and recovery strategy.

### What it must not do

- assume an application rollback automatically reverses database changes.
- run destructive reverse migrations without reviewing data loss risk.
- restore stale application code against an incompatible schema without a plan.
- erase incident evidence while trying to recover the service.
- claim zero-downtime rollback unless it has been validated.

### How to implement

- Define a rollback process appropriate to the selected hosting platform.
- Prefer backward-compatible database migrations where feasible.
- Document which schema changes are reversible and which require forward fixes or data recovery.
- Test rollback and recovery in a non-production environment where practical.
- Keep deployment versions and migration history traceable.
- Document who can authorize emergency production changes.

### Acceptance criteria

- Application rollback steps are documented and tested where practical.
- Database migration risks are addressed separately from application deployment rollback.
- Recovery does not rely on undocumented destructive operations.

---

## Feature 16: Cost and Free-Tier Resource Management

### What it must do

- Document the applicable free-tier or low-cost limits for Cloudflare, Neon, Clerk, and any other approved services.
- Identify usage-based billing risks and quotas.
- Monitor or review consumption where the providers offer suitable tools.
- Document which features may require paid plans as usage grows.
- Avoid unnecessary infrastructure and duplicated service costs.
- Provide an upgrade path if the application outgrows free-tier limits.

### What it must not do

- claim a service is permanently free without checking its current terms.
- assume a free-tier limit is sufficient for production traffic without estimating usage.
- introduce paid services without approval.
- silently disable essential security or reliability features to stay within a quota.
- make guarantees about cost that cannot be substantiated.

### How to implement

- Check current official provider plans and relevant quotas.
- Record the limits that affect database connections, storage, compute, deployment, authentication, and logging.
- Identify quota-exhaustion behavior and alerting options.
- Keep architecture simple until measured requirements justify expansion.
- Document expected cost risks and triggers for revisiting the plan.

### Acceptance criteria

- Current relevant free-tier limits are documented with a review date.
- Usage and upgrade risks are identified.
- No unapproved paid service is introduced.

---

## Cross-category dependencies

### Category 1 — Dashboard Experience & Interface
- Production loading, empty, error, retry, and connection-status states.
- Refresh and stale-data indicators.
- Responsive and accessible user experience under production conditions.
- Safe display of demo versus live application state.

### Category 2 — Organizations, Customers & Subscription Operations
- Prisma schema and migration needs for tenants, memberships, customers, products, subscriptions, invoices, payment records, and financial relationships.
- Safe seed data and production separation.
- Database indexes and constraints appropriate to actual query patterns.

### Category 3 — Finance, Analytics & Reporting
- Reliable database queries and consistent aggregation.
- Safe export processing and private response caching.
- Financial precision, reconciliation, and audit-history preservation.
- Performance measurement for analytics and reports.

### Category 4 — Authentication, Permissions & Data Integrity
- Clerk runtime compatibility and secure secret configuration.
- Protected browser pages and API endpoints.
- Organization isolation, permission checks, webhook verification, and audit events.
- Security testing and production release gates.

Do not duplicate the feature ownership of other categories. Document interfaces, prerequisites, and unresolved decisions.

## Implementation phases

### Phase 1 — Architecture proof
- Inspect the actual stack and deployment configuration.
- Validate the Cloudflare deployment approach.
- Prove Prisma-to-Neon connectivity.
- Prove Clerk authentication on a protected API.
- Record tested versions and unresolved compatibility risks.

### Phase 2 — Database and environment setup
- Configure Neon and environment variables.
- Establish schema validation and migration workflow.
- Separate development, preview, and production environments.
- Add safe health and readiness checks.

### Phase 3 — First secure deployment
- Deploy to a preview or controlled environment.
- Verify HTTPS, authentication, API protection, and database access.
- Validate core dashboard workflows.
- Record the verified deployment URL and deployment process.

### Phase 4 — Automated delivery and monitoring
- Add or complete CI quality gates.
- Add appropriate error logging and operational monitoring.
- Document production release, rollback, and incident procedures.
- Validate dependency maintenance and secret-handling practices.

### Phase 5 — Reliability and scale readiness
- Verify backup and restore capabilities.
- Test recovery and migration procedures.
- Measure performance and optimize actual bottlenecks.
- Review resource limits and cost risks.
- Complete the production readiness checklist.

These phases control implementation order only. All required features must remain documented.

## Definition of done

Category 5 is complete only when:

- [ ] The repository and dependency versions have been inspected.
- [ ] The selected Cloudflare deployment architecture has been validated against the actual application.
- [ ] The deployed application connects successfully to Neon PostgreSQL.
- [ ] Prisma migrations are version-controlled and have a documented production workflow.
- [ ] Clerk authentication and protected APIs work in the deployed environment.
- [ ] `.env.example` contains no real secrets.
- [ ] Production configuration is separated from development and preview configuration.
- [ ] A verified live URL is available.
- [ ] Health and readiness checks provide accurate, safe results.
- [ ] CI runs the agreed validation checks before production deployment.
- [ ] Logs and errors do not expose secrets or unnecessary sensitive data.
- [ ] Backup and recovery capabilities are verified and documented.
- [ ] Deployment rollback and migration risks are documented.
- [ ] Performance and resource constraints have been reviewed.
- [ ] Demo seeding cannot silently overwrite production data.
- [ ] Provider free-tier limits and likely cost risks are documented.
- [ ] The README supports reproducible setup and deployment.
- [ ] Production readiness checks have evidence of completion.
- [ ] No unauthorized payment processing or money movement has been introduced.

## Instructions for this documentation task

First inspect:

- `plans/product-scope.md`
- Category 1 specification.
- Category 2 specification.
- Category 3 specification.
- Category 4 specification.
- `package.json` and the lockfile.
- The Prisma schema and migration history.
- Existing Next.js and Cloudflare configuration.
- Existing environment examples and README.
- Existing health, dashboard, transaction, and authentication routes.
- Existing CI/CD configuration, if any.

If an expected file or configuration is missing, report it rather than inventing its contents. Clearly distinguish verified current behavior from planned behavior.

Create or update only:

`plans/category-5-infrastructure-deployment-reliability.md`

Do not implement features, modify application code, change the database schema, run migrations, alter dependencies, change deployment configuration, commit, or push.

When finished, report:
1. The exact file created or updated.
2. The features and sections documented.
3. Any conflicts with existing specifications, schema, dependencies, or deployment assumptions.
4. Any missing prerequisites and unresolved decisions.
5. Confirmation that no application code, database schema, dependencies, or deployment configuration was changed.