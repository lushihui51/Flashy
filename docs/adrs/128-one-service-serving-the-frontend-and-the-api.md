# ADR 128: One service serving the frontend and the API

## Status

Active

## Context

The app is published for the people its owner gives its link to, and anyone else who finds it (PDR 053). Nothing deploys the app today, and the owner has a domain and no host.

The frontend is a single-page app that Vite bundles into static files (ADR 004), and the API is a FastAPI app (ADR 002).

A page's address is a path the frontend's router resolves in the browser (ADR 089), so no file on a server bears its name.

The API serves no frontend files. In development the frontend's own server serves the pages and forwards `/api` to the API, so the browser already sees one origin there.

The code allows a second origin: the API's CORS setting takes a list of origins, and the frontend takes the API's address from a setting that defaults to its own origin.

Every request carries an `Authorization` header (ADR 007) or an `X-Timezone` header (ADR 019), and either makes a browser ask permission before the request when the API is on another origin.

A response the API fails to produce carries no CORS headers, so across origins the browser reports it as no connection, whatever its status. The frontend reads a request that got no response as a lost connection, and a response with a status as a failure of that status (ADR 065).

Some static hosts forward a path to another server, each in its own way.

## Decision

We will serve the frontend and the API from one origin, by one service. The API's process serves the built frontend's files, and answers an address outside `/api` that names no file with the frontend's `index.html`, so that a page's address opens the app. That service is the only thing we deploy.

Where no built frontend exists, which is how development runs, the API starts and serves `/api` alone, and the frontend's own server serves the pages and forwards `/api`.

## Alternatives considered

### The frontend on a static host and the API on an address of its own

Rejected because every request would be preceded by a permission request, a failed response would read as a lost connection unless every endpoint mapped its failures, and two things would deploy that must agree on the API's shape.

### One origin through a static host that forwards `/api` to the API

Rejected because it is two providers, and the forwarding is a feature of the particular host.

## Consequences

**Positive**

- The developer deploys one thing, and the frontend always ships with the API it was built against.
- The user's browser makes no cross-origin request in production, so a response the API fails to produce reaches the frontend with its status.
- The developer maps no database outage to 503 on every endpoint, since the browser no longer hides a failed response.
- The developer runs development with two servers and nothing built, as before.

**Negative**

- The developer's change to the frontend alone restarts the API.
- The user is served the frontend's files by the API's process, with no content network in front.
- The developer's deployed build needs both Node and Python.

**Neutral**

- The developer who wants a content network in front adds one with no change to the code.
