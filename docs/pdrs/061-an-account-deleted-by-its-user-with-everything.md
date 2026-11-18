# PDR 061: An account deleted by its user, with everything

## Status

Active

## Context

A user may stop using Flashy and want everything it holds about them gone.

Flashy holds, for each user, their account, their sign-in through a sign-in service, and everything they made and rated. Deleting an account at the sign-in service leaves everything Flashy holds about it.

No way in Flashy deletes an account.

PDR 012 keeps every deck to the user who made it, so nothing a user made sits in anyone else's library.

Every deletion in Flashy asks the user to confirm it, and says it cannot be undone.

PDR 060 lands a user who logs out on Home, in the example library.

Google's sign-in review expects an app's privacy policy to say how a person gets their data deleted.

A deletion done by hand on request has the user write, wait, and trust that it happened.

## Decision

We will let a user delete their own account, themselves, at any time.

We will delete it only once the user has confirmed it, told that it cannot be undone.

Deleting an account takes the account, its sign-in and everything the user made in Flashy, at once, and keeps nothing of them.

We will leave a user whose account is deleted where logging out leaves them.

## Alternatives considered

### Deletion on request to Flashy's owner, done by hand

Rejected because the user writes, waits, and must trust that it happened.

### Both the user's own deletion and a request to the owner

Rejected because the user's own deletion alone is chosen, and a request would do nothing it does not.

## Consequences

**Positive**

- The user deletes their account and everything in it themselves, whenever they choose, with nothing to wait for.
- The user who deletes their account leaves nothing of theirs in Flashy.

**Negative**

- The user who confirms a deletion by mistake loses everything they made, their mastery included, with no way back.

**Neutral**

- The user whose account is deleted finds themselves where logging out leaves them, in the example library.
- The user who comes back after deleting their account starts with an empty one.
