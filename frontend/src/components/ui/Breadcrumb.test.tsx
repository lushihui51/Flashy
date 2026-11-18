// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
  type DataRouter,
} from 'react-router-dom';
import { renderWithRouter } from 'src/test/testUtils';
import { hasEarlierPage } from 'src/lib/historyIndex';
import Breadcrumb from 'src/components/ui/Breadcrumb';

// Only a router that keeps its position in the browser's history can hold an earlier page
// in Flashy, which a memory router never does, so the case on going back opens a browser
// router on the entry jsdom holds.
function renderUnderBrowserRouter(): DataRouter {
  const page = <Breadcrumb places={[{ label: 'Your library', to: '/library' }]} />;
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route path="/" element={page} />
        <Route path="/decks/:deckId" element={page} />
      </>,
    ),
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('Breadcrumb', () => {
  let router: DataRouter | undefined;

  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    router = undefined;
  });

  afterEach(() => {
    router?.dispose();
  });

  it('renders each place as a link to its address, in order, inside a navigation named Breadcrumb', () => {
    renderWithRouter(
      <Breadcrumb
        places={[
          { label: 'Your library', to: '/library' },
          { label: 'Vocab', to: '/decks/d1' },
        ]}
      />,
    );

    const row = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const links = within(row).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Your library', 'Vocab']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/library', '/decks/d1']);
  });

  it('puts one separator between places and none before the first', () => {
    renderWithRouter(
      <Breadcrumb
        places={[
          { label: 'Your library', to: '/library' },
          { label: 'Vocab', to: '/decks/d1' },
          { label: 'Bonjour', to: '/cards/c1' },
        ]}
      />,
    );

    const row = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(row).toHaveTextContent(/^Your library›Vocab›Bonjour$/);
  });

  it("renders a place's icon inside its link", () => {
    renderWithRouter(
      <Breadcrumb
        places={[
          { label: 'Your library', to: '/library' },
          { label: 'Vocab', to: '/decks/d1', icon: <svg data-testid="place-icon" /> },
        ]}
      />,
    );

    const link = screen.getByRole('link', { name: 'Vocab' });
    expect(within(link).getByTestId('place-icon')).toBeInTheDocument();
    expect(link.firstElementChild).toContainElement(screen.getByTestId('place-icon'));
    expect(link.lastElementChild).toHaveTextContent(/^Vocab$/);
  });

  it('renders a single place with no separator', () => {
    renderWithRouter(<Breadcrumb places={[{ label: 'All practices', to: '/practices' }]} />);

    const row = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(row).getByRole('link', { name: 'All practices' })).toHaveAttribute(
      'href',
      '/practices',
    );
    expect(row).toHaveTextContent(/^All practices$/);
  });

  it('shows no Back button after a push, with an earlier page in Flashy', async () => {
    router = renderUnderBrowserRouter();

    await act(() => router!.navigate('/decks/d1'));

    expect(router!.state.location.pathname).toBe('/decks/d1');
    expect(hasEarlierPage()).toBe(true);
    const row = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(row).queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    expect(row).toHaveTextContent(/^Your library$/);
  });
});
