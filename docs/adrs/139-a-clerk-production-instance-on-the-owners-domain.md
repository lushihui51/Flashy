# ADR 139: A Clerk production instance on the owner's domain

## Status

Active

## Context

Clerk is the authentication provider, and the API verifies the tokens it issues (ADR 007). The API accepts a session only when its issuer is `clerk_fapi_url` and its `azp` is in `permitted_origins`.

The app is served from one origin (ADR 128), and production's settings live in the Railway service's variables, apart from development's in every value (ADR 137).

The example library is made by using the app as an account, in the database that is to show it (ADR 129).

Clerk requires a domain the developer owns for a production instance, serves that instance's Frontend API from a subdomain of it, and lists the DNS records to add in its dashboard. The records can take up to 48 hours to spread. The owner has a domain.

A Clerk development instance is capped at 100 users, shows its sign-in on a development address, and Clerk calls it unsuitable for production.

Clerk's dashboard offers to clone a development instance's settings into a new production instance, leaving out single sign-on connections, integrations and paths.

User data cannot be moved between Clerk instances.

A social sign-in runs on Clerk's shared credentials in development, and needs the developer's own in production.

Clerk's free plan allows 50,000 returning users a month for an app.

## Decision

We will give production a Clerk production instance of its own, on the owner's domain, and keep the development instance for development.

The production instance is made by cloning the development instance's settings, and its DNS records are added to the domain as Clerk's dashboard lists them.

The service's variables hold its publishable key, its Frontend API address as `CLERK_FAPI_URL`, and the app's one address as the only entry of `PERMITTED_ORIGINS`.

## Alternatives considered

### The development instance used for production

Rejected because it stops at 100 users, shows its sign-in on a development address, and Clerk says not to.

### A production instance started from Clerk's default settings

Rejected because the ways to sign in would then differ between development and production with nothing saying so.

## Consequences

**Positive**

- The owner pays nothing for Clerk at the app's expected size.
- The developer finds the same ways to sign in in development and in production from the start.

**Negative**

- The owner makes in production the account that makes the example library, since no account made in development exists there, the owner's included.
- The user can sign in to production only once the DNS records have spread, so the owner adds them days before publishing.
- The owner sets up credentials with each provider whose social sign-in production offers.
- The user who starts a session at any other address of the service is refused by the API.

**Neutral**

- The user reaches the app at one address.
