# ADR 068: The configuration's name on its snapshot, live while linked

## Status

Superseded by ADR 107

## Context

A practice spans one `practice_deck` snapshot per deck, each cut from one `deck_practice_config` (ADR 013). The overview row and the detail page showed only subject · deck chips, so two practices on the same deck with different configurations looked alike, and every configuration defaulted to a timestamp (ADR 067), so a row could not have said which layout it ran anyway.

A run has no way to name its configuration. The snapshot copies the six arrays but not the name. ADR 040's `source_config_id` reaches the live configuration, but a material edit nulls it on every snapshot cut from that configuration, and so does deleting the configuration; only a rename keeps it. A label read through the link alone vanishes from every past practice the moment the user adjusts that configuration's layout, and snapshots from before ADR 040 have no link at all.

## Decision

We will give `practice_deck` a nullable `source_config_name`. The practice summary's per-deck entry carries `configuration_name`: the live `deck_practice_config.name` when `source_config_id` resolves to a row, otherwise `source_config_name`, otherwise null. The summary read left-joins the configuration inside its existing deck query, so it stays two queries regardless of row count. Generation, validation and rerun still read nothing through the link.

Four rules keep the stored name meaning "the configuration's name as of the last moment the link existed":

- Run start writes the configuration's name onto the snapshot.
- A non-material update that carries a name writes it onto every snapshot whose `source_config_id` is that configuration, in the update's transaction. A material update severs and propagates nothing, so a practice keeps the name that described the layout it ran.
- Rerun copies the old snapshot's stored name verbatim, possibly null, exactly as it copies `source_config_id`.
- The migration backfills the stored name onto every snapshot whose link is intact, from the linked configuration's current name. A linked configuration's layout cannot have changed since the snapshot (the sever rule), only its name, so this is the value the rules above would have maintained. Unlinked snapshots stay null and show the deck alone.

A rename therefore reaches the labels of past practices. The invariant "editing a configuration never touches any practice; the UI never implies otherwise" keeps its behavioural half and loses its display half.

## Alternatives considered

### Read the live name only, deck alone after sever

Rejected: every layout edit strips the label from all past practices of that configuration, and the conservative sever rule makes that routine.

### Build the label from the snapshot's field names

Rejected: a heavier join on every list read, and a label that drifts from the name the user gave.

### Keep the link through layout edits

Rejected: it changes what attribution means for the statistics cycle the sever rule protects.

### Store the name at start only, never updated

Rejected: rename a date-named configuration, later edit its layout, and the row falls back to the date.

### No backfill

Rejected: runs started after the lineage column and before this change would lose their label on the first later edit, with nothing to fall back to.

## Consequences

**Positive**

- The user sees which configuration a practice ran, and a rename reaches old practices without a rebuild.
- The developer keeps the summary read's two-queries-regardless shape; the label costs one left join.

**Negative**

- The developer keeps the order of the two UPDATEs in `update_deck_practice_config`, sever before name.
- The user's snapshots from before the lineage column can never show a configuration name.
- The user who renames a configuration after a sever does not see the practice's label change, by design.

**Neutral**
