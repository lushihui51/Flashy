// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from 'src/test/testUtils';
import FullScreenDialog from 'src/components/ui/FullScreenDialog';
import { SubjectFormBody } from 'src/components/library/SubjectForm';

describe('SubjectFormBody — bringing the Name input and its sentence on screen', () => {
  it("a blank-name Create in the overlay scrolls the dialog's content once and the window not at all", async () => {
    const scrollBy = vi.spyOn(window, 'scrollBy');
    const dialogScrollBy = vi.spyOn(Element.prototype, 'scrollBy');
    const user = userEvent.setup();
    renderWithProviders(
      <FullScreenDialog open onClose={() => {}} ariaLabel="New subject">
        <SubjectFormBody
          mode="create"
          subjectId={undefined}
          original={undefined}
          onSuccess={() => {}}
          onCancel={() => {}}
        />
      </FullScreenDialog>,
    );

    const dialog = await screen.findByRole('dialog', { name: 'New subject' });
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));

    expect(await within(dialog).findByText('Name is required.')).toBeInTheDocument();
    expect(dialogScrollBy).toHaveBeenCalledTimes(1);
    expect(dialogScrollBy.mock.contexts[0]).toBe(dialog);
    expect(scrollBy).not.toHaveBeenCalled();
    dialogScrollBy.mockRestore();
    scrollBy.mockRestore();
  });
});
