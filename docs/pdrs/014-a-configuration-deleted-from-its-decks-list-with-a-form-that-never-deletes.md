# PDR 014: A configuration deleted from its deck's list, with a form that never deletes

## Status

Active

## Context

A configuration says how a deck's cards are asked in a practice. The user meets it as a row on the Configurations tab of its deck's page, as a choice on New practice, and in its form, New configuration or Edit configuration, where it is made and changed. It has no page of its own.

PDR 003 puts what the user can do to the thing a page shows in the page's header, and what adds to a list inside the list. A thing without a page has no header to hold its acts.

PDR 004 makes a form about one thing, and brings the user who made a thing from a picker inside another form back to that form with the new thing chosen. A configuration's form is opened that way from New practice, where configurations are chosen, as well as from its deck's page.

The user who wants a configuration gone has it in view in its row on its deck's page and in its form. A delete put in the list would be met while reading the list. A delete put in the form would sit beside the save and the way out, a third act that cannot be undone, met by a user who opened the form to change the thing.

## Decision

We will give a configuration no page of its own.

We will have the user delete a configuration from the list of its deck's configurations, where it is shown.

We will have a configuration's form offer two acts, to save and to back out, and never a delete.

## Alternatives considered

### A delete button on the configuration's edit form

Rejected because the user who opened the form to change a configuration would meet a destructive act beside the save, and the user who opened it from a picker inside another form would come back to a choice naming a configuration that no longer exists.

## Consequences

**Positive**

- The user deletes a configuration where they see it listed, and meets no destructive act in a form.
- The user who comes back from a configuration's form to the choice that opened it finds every configuration it names still there.

**Negative**

- The user who is in a configuration's form and wants it gone backs out to the list first.

**Neutral**

