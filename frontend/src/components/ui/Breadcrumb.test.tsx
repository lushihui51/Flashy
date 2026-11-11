// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
  useLocation,
  type DataRouter,
} from 'react-router-dom';
import { renderWithRouter } from 'src/test/testUtils';
import Breadcrumb from 'src/components/ui/Breadcrumb';

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

// The "<" shows only under a router that keeps its position in the browser's history,
// so these tests open a browser router on the entry jsdom holds.
function renderUnderBrowserRouter(): DataRouter {
  const page = (
    <>
      <Breadcrumb places={[{ label: 'Your library', to: '/library' }]} />
      <LocationProbe />
    </>
  );
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
    expect(link.firstChild).toBe(screen.getByTestId('place-icon'));
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

  it('shows no Back button under a memory router', () => {
    renderWithRouter(<Breadcrumb places={[{ label: 'Your library', to: '/library' }]} />);

    const row = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(row).queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('shows no Back button on the opened entry, a replace on it included', async () => {
    router = renderUnderBrowserRouter();
    const row = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(row).queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();

    await act(() => router!.navigate('/?tab=decks', { replace: true }));

    expect(within(row).queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'Your library' })).toBeInTheDocument();
  });

  it('shows a Back button after a push, and its click returns to the first address', async () => {
    const user = userEvent.setup();
    router = renderUnderBrowserRouter();

    await act(() => router!.navigate('/decks/d1'));

    expect(screen.getByTestId('location')).toHaveTextContent('/decks/d1');
    const row = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const back = within(row).getByRole('button', { name: 'Back' });
    expect(row.firstElementChild).toBe(back);

    await user.click(back);

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/'));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
    expect(within(row).queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });
});
