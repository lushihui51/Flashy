import type { ReactNode } from 'react';
import PickerCombobox, { type PickerComboboxProps } from 'src/components/ui/PickerCombobox';

type DeckPickerItem = { id: string; name: string; subject_name: string };

type DeckPickerProps<T extends DeckPickerItem> = PickerComboboxProps<T> & {
  renderBeneath?: never;
  renderLeading?: never;
};

/** The one picker for a list of decks: `PickerCombobox` with each row's subject beneath its
 * name. Takes every prop of `PickerCombobox` but `renderBeneath` and `renderLeading`. */
export default function DeckPicker<T extends DeckPickerItem>(props: DeckPickerProps<T>): ReactNode {
  return <PickerCombobox<T> {...props} renderBeneath={(deck) => deck.subject_name} />;
}
