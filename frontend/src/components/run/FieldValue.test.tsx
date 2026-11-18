// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FieldValue from 'src/components/run/FieldValue';

function renderMedia(type: 'image' | 'audio') {
  return render(
    <FieldValue
      field={{ field_def_id: 'f1', name: 'Photo', type, value: 'https://example.test/media' }}
      labeled={false}
      zone="answer"
    />,
  );
}

// jsdom does no layout, so these read where each dialog is placed from its classes; the
// browser check measures it.
describe('FieldValue media', () => {
  it("a picture's dialog covers the window and closes on a press outside its surface", async () => {
    const user = userEvent.setup();
    renderMedia('image');

    await user.click(screen.getByRole('button'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('fixed', 'inset-0', 'p-4');
    const surface = screen.getByTestId('picture-surface');
    expect(dialog).toContainElement(surface);
    expect(surface).toContainElement(screen.getByRole('img'));
    expect(screen.getByRole('img')).not.toHaveClass('max-h-[70vh]');

    await user.click(surface);
    await user.click(screen.getByRole('img'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(dialog);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it("a sound's dialog is held to the column", async () => {
    const user = userEvent.setup();
    renderMedia('audio');

    await user.click(screen.getByRole('button'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('fixed', 'inset-x-column', 'mx-4');
    expect(dialog).not.toHaveClass('inset-x-4');
    expect(dialog.querySelector('audio')).not.toBeNull();
  });
});
