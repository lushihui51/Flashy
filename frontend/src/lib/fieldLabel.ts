/** A field's name as the user reads it: in square brackets, as "[Definition]". A name that is
 * only spoken, as an accessible name or an image's alt, is used bare instead. */
export function fieldLabel(name: string): string {
  return `[${name}]`;
}
