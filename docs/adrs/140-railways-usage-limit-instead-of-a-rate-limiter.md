# ADR 140: Railway's usage limit instead of a rate limiter

## Status

Active

## Context

Fourteen reads answer a request with no account (ADR 131), and so does the health route (ADR 130). Each reaches the database.

The service runs on Railway's Hobby plan, where the bill follows what the service uses (ADR 137).

The app is published for the people its owner gives its link to, and a visitor is to see a filled app the moment the page opens (PDR 053). The app has had no traffic yet.

Railway lets any plan set a hard usage limit, of $10 at least, and at the limit takes every workload offline until the limit is raised. It emails at 75, 90 and 100 percent of the limit, and at an alert amount the owner sets.

Railway's edge stops attacks below the level of requests, and Railway says its limits on floods of requests may not always be enough.

Railway's Under Attack Mode, turned on per service for a set time or until turned off, puts a browser check before each new visitor and turns away anything that is not a browser.

Railway watches a service's health only while it deploys.

A limiter inside the app sees a request only once the request has reached the app's process, and several people behind one address share that address.

A second provider's proxy in front of the domain holds the domain's DNS, and Railway says it cannot always issue a certificate behind one.

## Decision

We will carry no rate limiter in the app.

We will meet a flood of requests on Railway: a hard usage limit of $20 a billing cycle caps the bill by taking the service offline, a usage alert below it warns the owner first, and Under Attack Mode is turned on by hand for as long as a flood lasts.

## Alternatives considered

### A limiter inside the app, counting by the caller's address

Rejected because every refused request would still reach the app's process, several people behind one address would share one allowance, and its threshold would be chosen with no traffic to choose it from.

### A second provider's proxy in front of the domain

Rejected because it would hold the domain's DNS, Clerk's records would have to go around it, and Railway says it cannot always issue a certificate behind one.

### Under Attack Mode left on

Rejected because every visitor would meet a browser check before the app, against PDR 053.

### A limit on the health route alone

Rejected because it is the cheapest of the fifteen routes open to anyone.

## Consequences

**Positive**

- The developer keeps no rate-limiting code in the API.
- The owner's worst month costs $20.

**Negative**

- The user finds the app slow or stopped during a flood, until the owner acts or the flood ends.
- The owner learns of a flood only from the usage emails.
- The user finds the app offline once the limit is reached, until the owner raises it, in a busy honest month as much as under a flood.

**Neutral**

- The developer returns to this decision first when the app draws real traffic.
