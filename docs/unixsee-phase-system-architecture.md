# Unixsee Phase 1 System Architecture

_Next.js dashboard + NestJS BFF + WordPress operations platform_

**Status:** Proposed  
**Date:** 27 July 2026

> **Architecture decision:** Next.js consumes only NestJS. WordPress supplies the admin experience and business/content workflows. NestJS remains the application gateway, authorization boundary, operational backend, and real-time system.

# 1. Purpose and scope

This document defines the recommended Phase 1 architecture for the Unixsee application based on the currently implemented dashboard routes and the agreed product flows. It focuses on system boundaries, data ownership, integrations, runtime flows, and implementation order rather than UI design or low-level code.

The existing Next.js source already represents these dashboard modules:

- Dashboard overview with website list, notifications, and activities.
- Plans and a checkout-like request form that must become a plan-request workflow.
- Website list and website details.
- Tickets and ticket conversations.
- Complementary-service requests and service tracking.
- Profile and security settings.
- Help Center topics and articles.
- Domains UI, which should remain outside the committed Phase 1 backend scope until ownership and workflows are explicitly approved.

> **Source-state note:** The current UI is fixture/mock-data driven. This architecture defines how those view models should be supplied by real services without coupling Next.js directly to WordPress or infrastructure systems.

# 2. Architectural conclusion

Unixsee should use a layered modular architecture with a single frontend-facing backend:

- Next.js is the presentation layer.
- NestJS is the Backend-for-Frontend (BFF), API gateway, authentication/token authority, authorization boundary, workflow orchestrator, and real-time gateway.
- WordPress is the business operations and content platform, including the administrator experience.
- PostgreSQL is the authoritative operational database for websites, servers, agents, metrics, actions, and activity events.
- WordPress storage is authoritative for editorial and admin-heavy business records where its ecosystem provides clear leverage.
- Edge agents communicate only with NestJS, never with WordPress or Next.js.

Using WordPress as the admin panel does not mean every entity edited in WordPress must be stored in the WordPress database. The WordPress plugin should act as a control-plane UI for NestJS-owned operational entities and as the native owner of content/business workflows that belong in WordPress.

# 3. Logical architecture

```text
User Browser
|
| HTTPS / Socket.IO
v
Next.js Dashboard and Public UI
|
| REST + Socket.IO only
v
NestJS BFF / Core Application
|-- Authentication, tokens, tenant authorization
|-- Dashboard aggregation and API view models
|-- Websites, servers, agents, metrics, alerts, actions
|-- Unixsee activity feed and audit trail
|-- WordPress integration adapter
|
+--> PostgreSQL
+--> Edge Agents over authenticated HTTPS
+--> WordPress Unixsee Bridge over private server-to-server API
+--> WordPress Media Library for ticket/request attachments

WordPress Admin + Unixsee Bridge Plugin
|-- User and customer administration
|-- Plan requests and onboarding workflow
|-- Tickets and complementary services
|-- Notifications, Help Center, stories, assessments, subscriptions
|-- Later: billing, payments, testimonials, blog
+--> WordPress database
+--> NestJS administrative API for operational entities
```

## 3.1 Control plane versus execution plane

| **Plane**              | **Responsibility**                                                                                             | **Primary technology**     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Presentation           | Customer dashboard and public experience. No direct data access to WordPress or agents.                        | Next.js                    |
| Application/API        | Authentication, authorization, aggregation, orchestration, REST, Socket.IO, and stable contracts.              | NestJS                     |
| Business control plane | Admin screens, editorial content, support and service workflows, provider selection, and operational controls. | WordPress + Unixsee plugin |
| Operational execution  | Agent ingestion, monitoring, action dispatch, alert evaluation, live traffic, and activity generation.         | NestJS + PostgreSQL        |
| Infrastructure data    | Operational metrics and append-only checks stored in PostgreSQL.                                               | PostgreSQL                 |

# 4. Data ownership and source of truth

Every entity must have one authoritative owner. Cross-system references are allowed; full bidirectional duplication is not.

| **Domain / entity**                                                  | **Authoritative owner**            | **Architecture rule**                                                                                                                          |
| -------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| User directory and customer profile                                  | WordPress                          | NestJS stores only the external WordPress user ID, tenant membership, authorization projection, and session data required for API enforcement. |
| Access/refresh tokens and sessions                                   | NestJS                             | NestJS validates the login flow, performs optional second-factor checks, rotates refresh tokens, and issues Unixsee tokens.                    |
| Plan catalog                                                         | WordPress                          | NestJS exposes a normalized read model to Next.js. Prices and plan labels must not be hard-coded in the frontend.                              |
| Plan requests and onboarding status                                  | WordPress                          | This is an admin-heavy business workflow. NestJS proxies commands and normalizes status for the dashboard.                                     |
| Servers, VPS nodes, agents, websites, service assignments            | NestJS/PostgreSQL                  | WordPress admin screens manage these records through the NestJS administrative API; WordPress does not duplicate their full state.             |
| Availability, software checks, security state, traffic and metrics   | NestJS/PostgreSQL                  | Produced by agents and backend jobs. Live fields are streamed through Socket.IO.                                                               |
| Unixsee activities                                                   | NestJS/PostgreSQL                  | Single feed for manual admin activity and system-generated operational events. WordPress submits manual items through the NestJS admin API.    |
| Dashboard notifications/news                                         | WordPress                          | Editorial items managed in WordPress and delivered through NestJS.                                                                             |
| Tickets, messages, and attachments                                   | WordPress                          | NestJS is the client-facing facade. WordPress stores attachments in its Media Library and links them to ticket and message records.              |
| Complementary service requests and assignments                       | WordPress                          | Business workflow and admin review live in WordPress; NestJS exposes a stable customer API.                                                    |
| Help Center, stories, assessments, subscriptions, testimonials, blog | WordPress                          | Content and lead-management workloads are native WordPress responsibilities.                                                                   |
| Action jobs: clear cache, retry checks                               | NestJS/PostgreSQL                  | NestJS authorizes, queues, dispatches, records, and audits operational commands.                                                               |
| Billing and payment                                                  | WordPress/WooCommerce, later phase | NestJS presents billing data and delegates payment/order operations to the WordPress integration.                                              |

## 4.1 Tenant Ownership and Access Model

A tenant represents an approved Unixsee customer account.

- Users belong to tenants through a `tenant_users` membership table.
- Each membership defines the user’s role, such as `owner`, `admin`, or `viewer`.
- Each website belongs to exactly one tenant through `websites.tenant_id`.
- Users are not directly linked to websites.
- NestJS authorizes website access by confirming that the user belongs to the tenant that owns the website.

```text
User → Tenant membership → Tenant → Website
```

Per-website user permissions may be added later as a separate authorization layer without changing website ownership.

> **Critical rule:** NestJS must not query WordPress tables directly. It communicates only through a versioned private API implemented by the Unixsee WordPress plugin.

# 5. NestJS module boundaries

| **Module**                       | **Primary responsibilities**                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Auth & Identity                  | Login orchestration, access/refresh tokens, second factor, session revocation, WordPress user mapping, tenant context. |
| Dashboard                        | Aggregates website summary, notifications, Unixsee activities, and relevant counts into one dashboard response.        |
| Plan Requests                    | Normalizes plan catalog and request status; delegates request creation and admin workflow to WordPress.                |
| Websites & Services              | Website identity, plan assignment, service metadata, links, billing projection, ownership, and authorization.          |
| Agents & Ingestion               | Authenticated agent payload ingestion, validation, idempotency, persistence, and event publication.                    |
| Monitoring & Alerts              | Availability state, software/update checks, security status, traffic, thresholds, incidents, and stale-data handling.  |
| Realtime Gateway                 | Tenant-scoped Socket.IO rooms and live website updates.                                                                |
| Actions                          | Clear cache, status retry, future operational commands, job state, retries, and audit events.                          |
| Activities                       | Manual and system-generated website activity feed; filtering by tenant and website.                                    |
| WordPress Integration            | Typed client, retries, circuit breaker, schema translation, webhook handling, and cache invalidation.                  |
| Tickets & Complementary Services | BFF facades over WordPress-owned support and service workflows.                                                        |
| Content & Leads                  | BFF facades for Help Center, notifications, stories, assessment requests, subscriptions, testimonials, and blog.       |
| Audit & Administration           | Administrative commands, immutable audit trail, actor identity, and change history.                                    |

# 6. Primary system flows

## 6.1 Plan request and website onboarding

1. The user selects a plan in Next.js. The current checkout screen is renamed and reworded as a plan request; it must not imply payment.

2. Next.js sends the request to NestJS with the selected plan and contact/site information.

3. NestJS validates the tenant and forwards the request to the WordPress Unixsee Bridge.

4. WordPress creates the request and exposes it to administrators for assessment and follow-up.

5. After approval, administrators provision or select infrastructure. Operational server and website records are created through the NestJS administrative API.

6. Migration/build work progresses outside the customer UI, while approved milestones may create Unixsee activity events.

7. When the website is activated and assigned to the user tenant, it appears in the dashboard automatically.

## 6.2 Dashboard overview

1. Next.js requests one dashboard view model from NestJS.

2. NestJS reads website summaries and recent activities from PostgreSQL.

3. NestJS reads published notifications from WordPress, preferably from a short-lived cache.

4. NestJS returns a single tenant-filtered response shaped for the implemented dashboard components.

5. Socket.IO updates only live fields after initial REST hydration.

## 6.3 Website details and operational actions

Initial page data is returned by REST. The following fields are live and should be updated through Socket.IO: availability, lastCheckedAt, activeNow, and activeNowMeasuredAt. Historical or structural values remain REST data.

- Clear Cache: Next.js sends a command to NestJS; NestJS authorizes it, creates an action job, dispatches it to the correct agent/integration, records the result, and creates an activity event.
- Renew Service: Next.js sends the command to NestJS; NestJS delegates the billing operation to WordPress/WooCommerce and returns the normalized result.
- All action commands require idempotency keys and produce an audit record.
  An idempotency key is a unique value sent with the command so the backend does not perform the same action twice if the user double-clicks or the request is retried.

An audit record is a database log showing exactly what happened:

```
Action: Clear cache
Website: example.com
User: Ali
Time: 2026-07-27 10:30
Result: Successful`
```

## 6.4 Unixsee activities

Unixsee activities are a tenant-visible operational timeline, not a generic WordPress post feed. Each item should contain an ID, title, timestamp, website reference when applicable, actor/source, event type, visibility, and optional metadata.

- Manual activity: an administrator creates an item in the WordPress admin UI; the plugin submits it to the NestJS Activities API.
- System activity: NestJS creates an item automatically after successful actions or operational events, such as a backup or cache clear.
- Unixsee activities don't show in website details page. (optional for later).
- Activities are append-only. Corrections should create a replacement/correction event rather than silently rewriting history.

## 6.5 Tickets

1. The user selects a service, optionally selects a website, enters a subject and description, and uploads attachments.

2. NestJS validates ownership and file constraints, forwards the files through the private WordPress API, and WordPress stores them in its Media Library and links them to the ticket.

3. WordPress handles admin assignment, replies, and status workflow.

4. NestJS returns normalized ticket lists, detail threads, and status updates to Next.js.

## 6.6 Complementary services

1. The user submits a service request through NestJS.

2. WordPress stores the request and provides the administrator review workflow.

3. After review, an administrator creates the customer service assignment with type, website, status, dates, quota or project progress, and activity history.

4. NestJS exposes the assignment to the dashboard and enforces tenant access.

## 6.7 Profile and verification

NestJS should create the OTP, then send the phone number and OTP message to WordPress through a private API.
WordPress then uses the selected SMS provider/plugin to send it.

Flow:

```
NestJS creates OTP
→ NestJS sends phone + message to WordPress
→ WordPress sends SMS
→ User submits OTP to NestJS
→ NestJS verifies it
```

Do not let WordPress verify the OTP.

Username/Password login flow:

```
→ User submits username/email and password to NestJS.
→ NestJS sends the credentials to a private WordPress authentication endpoint.
→ WordPress validates the password and checks that the account is active.
→ WordPress returns the user ID, tenant membership, role, and 2FA status.
→ If 2FA is enabled, NestJS starts and verifies the OTP challenge.
→ After successful authentication, NestJS issues Unixsee access and refresh tokens.
```

- Profile reads and edits pass through NestJS and are applied to the WordPress user record through the private API.
- Email and phone verification are explicit workflows with expiring, rate-limited challenges.
- The active SMS provider may be selected from the WordPress admin control plane, but token issuance and verification state transitions remain controlled by NestJS.
- Password changes revoke applicable refresh-token sessions.

- Optional two-factor authentication is enforced by NestJS before issuing tokens.

  Flow:

```
Password accepted
→ NestJS checks whether 2FA is enabled
→ User submits the 2FA code
→ NestJS verifies it
→ NestJS issues access and refresh tokens
```

Before successful 2FA, NestJS may issue only a short-lived temporary challenge token—not normal access/refresh tokens.

## 6.8 Content, leads, and public features

| **Feature**             | **Owner and delivery pattern**                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Help Center             | WordPress manages topics and articles; NestJS provides public/customer read APIs and caching.                                           |
| Team stories            | WordPress manages profiles and image/video story items; media uses the WordPress Media Library.                                          |
| Store Assessment        | Public form submits to NestJS, which applies abuse protection and creates a WordPress lead/request record.                              |
| Newsletter subscription | Public form submits through NestJS; WordPress stores consent and subscription status and integrates with the selected mailing provider. |
| Testimonials            | Later phase; WordPress manages text, client relation, consent, video, publication status, and ordering.                                 |
| Blog                    | Later phase; fully WordPress-authored and delivered through NestJS or a controlled read-only content endpoint.                          |

# 7. API and event contracts

## 7.1 Client-facing REST groups

- /auth and /sessions
- /dashboard
- /plans and /plan-requests
- /websites and /websites/:id
- /websites/:id/actions/\*
- /activities and /notifications
- /tickets and /tickets/:id/messages
- /complementary-service-requests and /complementary-services
- /profile and /verification
- /help-center
- /public/assessment, /public/subscriptions, /public/stories, and later testimonials/blog

## 7.2 Socket.IO events

| **Event**                    | **Payload purpose**                                                           |
| ---------------------------- | ----------------------------------------------------------------------------- |
| website.availability.updated | availability, lastCheckedAt, optional latest check code, and staleness state. |
| website.traffic.updated      | activeNow and activeNowMeasuredAt.                                            |
| website.action.updated       | Progress and result for clear-cache or other asynchronous website actions.    |
| activity.created             | Optional live insertion of a newly visible Unixsee activity item.             |

Clients join tenant-scoped and website-scoped rooms only after authentication. The server derives room authorization from the token and database; clients never choose arbitrary tenant IDs.

## 7.3 WordPress integration contract

- Versioned private endpoints under a Unixsee Bridge plugin.
- Server-to-server authentication using signed requests or mTLS, plus network restrictions where possible.
- Stable DTOs independent of WordPress table names and third-party plugin schemas.
- Idempotency for request creation, replies, renewals, and webhook processing.
- Outbound WordPress webhooks for user status, ticket changes, plan-request changes, complementary-service changes, and published content invalidation.
- Retries with bounded backoff, circuit breaking, and dead-letter handling for failed synchronization events.

# 8. Security and tenancy requirements

- Next.js never receives WordPress administrator credentials, database access, agent secrets, or infrastructure tokens.
- Every customer request is tenant-scoped in NestJS before any repository or WordPress call is executed.

```
User asks for website ID 25
→ NestJS reads the logged-in user’s tenant ID
→ NestJS checks that website 25 belongs to that tenant
→ Only then NestJS queries PostgreSQL or calls WordPress
```

- Access tokens are short-lived. Refresh tokens are rotated, hashed at rest, revocable, and bound to a session/device record.
- WordPress user disablement, role changes, password changes, and account deletion must invalidate or restrict NestJS sessions through webhook-driven synchronization.
- Agent ingestion uses per-agent credentials, HMAC or equivalent request authentication, timestamp/nonce replay protection, and payload validation.
- Ticket and request attachments use content-type/size limits, malware scanning, WordPress Media Library storage, and tenant-scoped access checks.
- Operational actions require explicit capability checks, rate limits, idempotency, audit logging, and safe timeout/retry behavior.
- Secrets are stored outside WordPress content fields and source code. Admin UI may select providers, but secret material belongs in an encrypted secret store or protected runtime configuration.
- Every important change should create an audit log.

# 9. Reliability, caching, and asynchronous work

- NestJS should return partial dashboard data when WordPress content is temporarily unavailable; operational website data must remain usable.
- Cache low-volatility WordPress data such as plans, notifications, Help Center content, and published stories. Invalidate through WordPress webhooks.
- Do not cache live availability or active traffic as if current. Persist measurement timestamps and communicate stale state.
- Use background jobs for SMS/email dispatch, attachment scanning, WordPress webhook retries, website actions, and later billing reconciliation.
- Phase 1 may use a single NestJS instance with an abstract event dispatcher. Redis/BullMQ and the Socket.IO Redis adapter are introduced when horizontal scaling or dispatch volume requires them.
- Metrics remain append-only with timestamp-with-time-zone columns and composite time/entity keys in PostgreSQL.

# 10. Recommended implementation sequence

| **Stage**                   | **Deliverables**                                                                                                                                        | **Exit condition**                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1\. Foundation              | NestJS project structure, PostgreSQL schema, auth/session model, tenant authorization, WordPress Bridge skeleton, API conventions, audit log.           | A WordPress user can authenticate and receive a tenant-scoped Unixsee session.                          |
| 2\. Onboarding and websites | Plan catalog/read model, plan requests, admin onboarding workflow, server/website admin APIs, website list/details, agent ingestion, initial Socket.IO. | An approved request can result in a website visible to the correct user with live availability/traffic. |
| 3\. Dashboard communication | Dashboard aggregation, Unixsee activities, WordPress-managed notifications, website actions and action status.                                          | The current overview and website UI are fully backed by real APIs.                                      |
| 4\. Support workflows       | Tickets, messages, attachments, complementary-service requests and assignments.                                                                         | Users and administrators can complete both workflows end to end.                                        |
| 5\. Account and content     | Profile edits, verification, optional 2FA, Help Center, stories, assessment form, newsletter subscription.                                              | Current account/content features no longer use fixtures.                                                |
| 6\. Later capabilities      | Billing/payment, testimonials, blog, Redis/BullMQ, advanced alerting.                                                                                    | Introduced only after Phase 1 ownership and contracts are stable.                                       |

# 11. Architecture decisions and constraints

| **Decision**                                                         | **Rationale**                                                                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| NestJS is the only API used by Next.js.                              | Prevents frontend coupling to WordPress schemas, unifies authentication and authorization, and provides one stable contract.    |
| WordPress is an admin/control platform, not a universal database.    | Retains fast admin implementation without forcing operational and time-series workloads into WordPress.                         |
| Operational website data is owned by NestJS.                         | Agents, live metrics, actions, alerts, and server relations require a purpose-built backend and relational/time-series storage. |
| Business/content workflows are owned by WordPress where appropriate. | Tickets, requests, publishing, billing, and content benefit from WordPress administration and plugin integrations.              |
| Activities are owned by NestJS.                                      | The feed must merge manual team work with automatic infrastructure events and stay consistently linked to websites and tenants. |
| Cross-system integration is API/event based.                         | Direct database reads create brittle coupling and bypass service-level authorization and invariants.                            |
| The existing checkout flow becomes a request flow.                   | The real business process begins with assessment and provisioning, not immediate payment.                                       |

# 12. Phase 1 non-goals

- Microservices decomposition. NestJS should begin as a modular monolith.
- Direct Next.js-to-WordPress requests.
- Storing high-frequency metrics in WordPress.
- Duplicating complete user, website, ticket, or service records across both databases.
- Treating the WordPress admin UI as proof that WordPress must execute the underlying operation.
- Full payment checkout before the onboarding and service-activation workflow is stable.
- Redis or multiple NestJS instances before actual scale requires them.

# 13. Architecture acceptance criteria

- The browser communicates only with NestJS for application data and real-time updates.
- Each entity has one documented authoritative owner.
- A WordPress outage degrades WordPress-owned features without hiding operational website status already stored in NestJS.
- A user cannot access another tenant’s websites, tickets, activities, requests, or attachments by changing an ID.
- Plan selection creates a request and never falsely confirms payment.
- Admin provisioning creates NestJS-owned server and website records through an authenticated administrative API.
- Dashboard activities can originate from both administrators and automated system events but are presented through one NestJS feed.
- Live fields update through authenticated Socket.IO rooms, while REST remains the source for initial and historical data.
- WordPress integration can be replaced or modified without changing Next.js components or exposing WordPress schemas to the client.

# Reference basis

This proposal is based on:

- The current Unixsee Next.js source archive and its implemented dashboard routes/components.
- The agreed feature and workflow requirements in the architecture discussion.
- The existing System Architecture & Data Strategy document covering agent ingestion, PostgreSQL data strategy, Socket.IO, event dispatching, tenancy, and incident alerting.
