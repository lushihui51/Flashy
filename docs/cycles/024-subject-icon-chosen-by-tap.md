# 024 — The subject's icon chosen by tapping it

## Goal

Outcome: On New subject and Edit subject, the Icon control shows the subject's current picture, one tap opens the pictures the app offers and a second tap chooses one.

Scope: The Icon control and the sheet it opens, with the pictures of the curated set and their spoken names, on both routed forms and on the deck form's New subject overlay, which share the form body; the default picture for a subject whose picture was never chosen; the removal of the text box and its deferred marker; and the form's tests. Not covered: the set of pictures, the backend, the form's other fields and words, and the other places a subject's picture shows.

Judgement: On a live server, make a subject from New subject choosing a picture, make one without touching the control, and change a subject's picture from Edit subject, checking each on the subject's page and in the library; then open New subject… from the deck form and choose a picture there.

## Records

- PDR 004: A form about one thing, landing on the thing it made

## Tasks

### T1 — The icon picker on the subject form

**Status**

- [ ]

**Goal**

The subject form's Icon control shows the current picture and opens a sheet of the app's pictures, each spoken by its name, where one tap chooses.

**Dependencies**

None.

**Files**

- `frontend/src/lib/subjectIcon.ts`
- `frontend/src/lib/subjectIcon.test.ts`
- `frontend/src/components/library/SubjectIconPicker.tsx` (new)
- `frontend/src/components/library/SubjectIconPicker.test.tsx` (new)
- `frontend/src/components/library/SubjectForm.tsx`
- `frontend/src/components/library/SubjectForm.test.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`
- `frontend/src/components/ui/BottomSheet.tsx`

**Details**

On the subject form, the "Icon" shows the subject's current picture. Tapping it once opens the pictures the app offers, and tapping one of them chooses it. A subject whose picture was never chosen keeps the app's default picture. Nothing is typed: the text box goes, and no text box stays as a fallback. The form must keep its three fields, name, description and icon, and gain no other (PDR 004).

The pictures are the curated set in `subjectIcon.ts`, and each is spoken by its name, which this task fixes: `atom` "Atom", `book-open` "Open book", `brain` "Brain", `calculator` "Calculator", `camera` "Camera", `code` "Code", `coins` "Coins", `dna` "DNA", `dumbbell` "Dumbbell", `flask-conical` "Flask", `gavel` "Gavel", `globe` "Globe", `heart` "Heart", `headset` "Headset", `landmark` "Landmark", `languages` "Languages", `leaf` "Leaf", `microscope` "Microscope", `music` "Music", `palette` "Palette", `pen-tool` "Pen", `rocket` "Rocket", `scale` "Scale", `theater` "Theater", `trophy` "Trophy", `utensils` "Utensils". A name is spoken only and never shown as text. The sheet is spoken as "Icon", and the control as "Icon: " followed by the current picture's name, "Icon: Open book" when none is chosen.

The icon module's interface, beside the unchanged `subjectIcon`:

```ts
// frontend/src/lib/subjectIcon.ts
export type SubjectIconEntry = { key: string; name: string };
/** The curated set in the module's order, each key with its spoken name. */
export const SUBJECT_ICONS: readonly SubjectIconEntry[];
/** The spoken name of a picture; the default's name for a blank or unknown key,
 * matching `subjectIcon`'s fallback. */
export function subjectIconName(icon: string | null | undefined): string;
```

The picker's interface:

```tsx
// frontend/src/components/library/SubjectIconPicker.tsx
import type { RefObject } from "react";

type SubjectIconPickerProps = {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** The key shown as chosen; blank or unknown marks the default. */
  value: string;
  /** Called with the tapped picture's key; the caller closes the sheet. */
  onChange: (key: string) => void;
};

export default function SubjectIconPicker(
  props: SubjectIconPickerProps,
): ReactNode;
```

The picker renders `BottomSheet` with `ariaLabel="Icon"` and one `<button type="button">` per entry of `SUBJECT_ICONS`, in that order, each with `aria-label` set to the entry's name, `aria-pressed` true on the one whose key `subjectIcon` resolves `value` to, and `<SubjectIcon icon={key} />` as its content. Lay the buttons out as a grid of six columns with 44px targets; mark the pressed one with a ring in the primary color.

`BottomSheet` gains one optional prop, `aboveDialogs?: boolean`: when true, its overlay and content use `z-70` and `z-80` instead of `z-20` and `z-30`, so a sheet opened from inside a `FullScreenDialog` (`z-50`/`z-60`) renders above it, as `ConfirmDialog` already does for the same reason. The picker sets it; the shell's sheets must not change. The prop's JSDoc states that reason.

In `SubjectForm.tsx`, replace the Icon label's `<input>` with a `<button type="button">` that shows `<SubjectIcon icon={icon} className="h-6 w-6" />` in a 44px rounded square, carries the accessible name given above, and opens the picker; keep the visible word "Icon" above it as the other fields have theirs, marked `aria-hidden="true"` so it is not read twice. Hold the picker's open state in the form, pass the button's ref as `triggerRef`, and on `onChange` set `icon` and close the sheet. The `icon` state, the `dirty` test and both submit payloads stay as they are: `''` means not chosen, so a create without a choice sends no `icon` and the backend's default `book-open` applies, and an edit sends `icon` only when it changed. Remove the `TODO(defer:icon-picker)` comment with the input.

The picker's and the form's tests are jsdom tests; the picker's follows `CreateSheet.test.tsx`, rendering the sheet open with a stub `triggerRef`. In `DeckEditor.test.tsx`, query the picker's dialog from `screen`, not from within the overlay's dialog: Radix marks the outer dialog `aria-hidden` while the inner one is open.

**Out of scope**

- Changing the set of pictures or their keys: a later cycle.
- Any backend change; the column's default stays `book-open`: never.
- Any other word or control on the subject form: a later cycle.
- The picture's name as visible text in the control or the sheet: never; it is spoken only.
- Raising the stacking of the shell's own sheets: never; only the picker passes `aboveDialogs`.
- A text box kept beside the control: never.

**Done when**

- In `frontend/`, `npx vitest run src/lib/subjectIcon.test.ts` passes with two new cases: "lists every picture of the set once, each resolving to its own icon" and "names the current picture, and the default for a blank or unknown key".
- In `frontend/`, `npx vitest run src/components/library/SubjectIconPicker.test.tsx` passes with three cases: "renders a sheet named Icon with one button per picture, each named after its picture, in the set's order"; "marks the current picture as pressed and no other"; "tapping a picture calls onChange with its key".
- In `frontend/`, `npx vitest run src/components/library/SubjectForm.test.tsx` passes, its case "prefills from the existing subject" now finding the button named "Icon: Brain", its case "creates a subject with only a name and navigates to its page" unchanged, and three new cases: "has no text box for the icon"; "choosing a picture sends it with the create", whose POST body is `{ name: 'Chemistry', icon: 'atom' }`; "changing the picture sends only the icon on save", whose PATCH body is `{ icon: 'atom' }`.
- In `frontend/`, `npx vitest run src/components/library/DeckEditor.test.tsx` passes with the new case "the Icon control inside the New subject overlay opens the picker", which finds the dialog named "Icon".
- `grep -rn "TODO(defer:icon-picker)" frontend/src` prints nothing, and `grep -c 'type="text"' frontend/src/components/library/SubjectForm.tsx` prints `1`.
- At `localhost:5173` with the backend running, on New subject: the Icon control shows the default picture; tapping it opens the sheet; tapping a picture closes the sheet and the control shows it; Create lands on the subject's page showing that picture, and the library's Subjects tab shows it on the row.
- At `localhost:5173`: a subject created without touching the Icon control shows the default picture on its page; on Edit subject the control shows the subject's current picture, and choosing another then saving shows the new one on its page.
- At `localhost:5173`, on New deck: "New subject…" opens the overlay; tapping its Icon control opens the sheet above the overlay; choosing a picture and creating the subject leaves it chosen in the deck form.

**Debrief**

None.
