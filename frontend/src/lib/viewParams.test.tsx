// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { useViewParams } from 'src/lib/viewParams';

function WriteStub() {
  const { setParams } = useViewParams();
  return (
    <button type="button" onClick={() => setParams(new URLSearchParams('tab=decks'))}>
      Write
    </button>
  );
}

describe('useViewParams', () => {
  it('setParams replaces the entry, writes the params and asks for no scroll reset', async () => {
    const router = createMemoryRouter([{ path: '/library', element: <WriteStub /> }], {
      initialEntries: ['/library'],
    });
    render(<RouterProvider router={router} />);

    await userEvent.click(screen.getByRole('button', { name: 'Write' }));

    expect(router.state.location.search).toBe('?tab=decks');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(router.state.preventScrollReset).toBe(true);
  });
});
