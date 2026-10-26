# Backlog

- B1. How does a picture or audio value show on a card during a practice and in a practice's summary?
  - Reason: a field's only type is "Text", so the question waits for pictures and audio to exist; `FieldValue` in `frontend/src/components/practice/FieldValue.tsx` renders a picture or audio value as a small chip that opens the value over the page, so a zone's size stays predictable whatever the card holds
  - Owner: /product-decide
- B2. Does a summary's sort order survive a refresh, browser back, and a shared address, as a page's open tab and filters do?
  - Reason: PDR 005 keeps the open tab and filters across browser back and PDR 010 gives the summary three sort orders; neither says whether the chosen order is kept, and today it resets to "Gains first".
  - Owner: /product-decide
