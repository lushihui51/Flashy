import type { components } from 'src/api/types';

type FieldType = components['schemas']['FieldType'];

// TODO(defer:field-types) The backend FieldType enum has three members (text, image,
// audio) — this allowlist is the single place that governs what the frontend can
// actually create. Adding a type later is: add a widget to CardFieldsForm, add the
// member here. Nothing else.
export const SUPPORTED_FIELD_TYPES = ['text'] as const satisfies readonly FieldType[];

export type SupportedFieldType = (typeof SUPPORTED_FIELD_TYPES)[number];

export function isSupportedFieldType(type: string): type is SupportedFieldType {
  return (SUPPORTED_FIELD_TYPES as readonly string[]).includes(type);
}
