// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubjectIconPicker from 'src/components/library/SubjectIconPicker';
import { SUBJECT_ICONS } from 'src/lib/subjectIcon';

const triggerRef = { current: null };

function renderPicker(props: Partial<Parameters<typeof SubjectIconPicker>[0]> = {}) {
  return render(
    <SubjectIconPicker
      open
      onClose={() => {}}
      triggerRef={triggerRef}
      value=""
      onChange={() => {}}
      {...props}
    />,
  );
}

describe('SubjectIconPicker', () => {
  it("renders a sheet named Icon with one button per picture, each named after its picture, in the set's order", () => {
    renderPicker();

    expect(screen.getByRole('dialog', { name: 'Icon' })).toBeInTheDocument();
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(
      SUBJECT_ICONS.map((entry) => entry.name),
    );
  });

  it('marks the current picture as pressed and no other', () => {
    renderPicker({ value: 'brain' });

    const pressed = screen.getAllByRole('button', { pressed: true });
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toHaveAccessibleName('Brain');
  });

  it('marks the default as pressed when none is chosen', () => {
    renderPicker({ value: '' });

    const pressed = screen.getAllByRole('button', { pressed: true });
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toHaveAccessibleName('Open book');
  });

  it('tapping a picture calls onChange with its key', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPicker({ onChange });

    await user.click(screen.getByRole('button', { name: 'Atom' }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith('atom');
  });
});
