# PDR 062: A plain-words privacy page reached from every page

## Status

Active

## Context

A person who uses an app, or only looks around it, may want to know what it keeps about them, who else holds it, and how to have it deleted.

Google's sign-in review requires a public privacy policy, reachable from the app's home page, that says what is collected, who receives it, how it is deleted and whom to contact.

Flashy keeps, for each user, the sign-in service's name for them, their time zone, when they started their first run, and everything they make and rate. A person's name, email address and picture from their sign-in stay with the sign-in service, and Flashy shows them only in the user's account.

PDR 060 lets a guest change nothing, so Flashy keeps nothing of a guest.

Flashy has no ads, analytics or tracking. A sign-in service holds each user's sign-in, and everything else is stored on the service that runs Flashy's server.

PDR 012 keeps every deck to the user who made it, and shows it to no one else.

PDR 061 lets a user delete their own account and everything in it.

One person runs Flashy and answers questions about it by email.

A standard privacy policy is written in legal language, few users read it, and it often claims more than an app does.

PDR 059 has a page that says what Flashy is, which anyone reaches from every page and no one meets before the app. A guest never sees the account.

## Decision

We will have a page that says what Flashy keeps about a person and why, who else holds it, how a user has it deleted, and who runs Flashy and how to reach them.

We will write it in the screens' plain words, and have it claim nothing beyond what Flashy does.

We will let anyone, guest or user, reach it from every page, and let no one meet it before the app.

## Alternatives considered

### A standard policy in legal language

Rejected because users do not read it, and it claims more than Flashy does.

### Leaving out who else holds the data

Rejected because Google's sign-in review asks who receives it, and the user could not find where their data lives.

### A way to it from the account alone

Rejected because a guest never sees the account, Google's reviewer among them.

### A way to it only from the page that says what Flashy is

Rejected because a way from every page is preferred.

## Consequences

**Positive**

- The user reads, in under a minute, what Flashy keeps about them, who else holds it, and how to have it deleted.
- The user who is not logged in reads what Flashy would keep before making an account.
- The user knows whom to ask about their data, and how.

**Negative**

- The user who wants a policy's full legal terms finds none.

**Neutral**

- The user reads the names of the services that hold their data.
