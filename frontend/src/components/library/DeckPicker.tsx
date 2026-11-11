import type { ReactNode } from 'react';
import PickerCombobox, { type PickerComboboxProps } from 'src/components/ui/PickerCombobox';

type DeckPickerItem = { id: string; name: string };

type DeckPickerProps<T extends DeckPickerItem> = PickerComboboxProps<T> & {
  renderBeneath?: never;
  renderLeading?: never;
};

/** The one picker for a list of decks: `PickerCombobox` with each row the deck's name alone.
 * Takes every prop of `PickerCombobox` but `renderBeneath` and `renderLeading`. */
export default function DeckPicker<T extends DeckPickerItem>(props: DeckPickerProps<T>): ReactNode {
  return <PickerCombobox<T> {...props} />;
}
