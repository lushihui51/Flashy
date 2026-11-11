// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import PracticeOverviewPage from 'src/pages/PracticeOverviewPage';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';

const BASE = 'http://localhost:8000';

const practice = (id: string, name: string, deckNames: string[]) => ({
  id,
  name,
  created_at: '2026-11-01T00:00:00Z',
  decks: deckNames.map((deckName, i) => ({ deck_id: `${id}-d${i}`, deck_name: deckName })),
  active_run_id: null,
});

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

function renderOverview(practices: unknown[] | null) {
  server.use(
    http.get(`${BASE}/api/practices`, () =>
      practices
        ? HttpResponse.json(practices)
        : HttpResponse.json({ detail: 'boom' }, { status: 500 }),
    ),
  );
  return renderWithProviders(
    <Routes>
      <Route path="/practices" element={<PracticeOverviewPage />} />
      <Route path="*" element={<LocationProbe />} />
    </Routes>,
    ['/practices'],
  );
}

afterEach(() => server.resetHandlers());

describe('PracticeOverviewPage', () => {
  it('lists every practice in the order received, each name opening its page', async () => {
    renderOverview([
      practice('p2', 'Commands + Ports', ['Commands', 'Ports']),
      practice('p1', 'Evening', ['Ports']),
    ]);

    const list = await screen.findByRole('list');
    const links = within(list).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/practices/p2',
      '/practices/p1',
    ]);
    expect(links[0]).toHaveTextContent('Commands + Ports');
    expect(within(links[0]!).getByText('Commands')).toBeInTheDocument();
    expect(within(links[0]!).getByText('Ports')).toBeInTheDocument();
  });

  it('holds no tabs and no filter', async () => {
    renderOverview([practice('p1', 'Evening', ['Ports'])]);

    await screen.findByRole('link', { name: /Evening/ });
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('Add practice opens New practice with this page as cancelTo', async () => {
    const user = userEvent.setup();
    renderOverview([]);

    await user.click(await screen.findByRole('button', { name: 'Add practice' }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/practices/new?cancelTo=%2Fpractices',
    );
  });

  it('says No practices yet. with none', async () => {
    renderOverview([]);

    expect(await screen.findByText('No practices yet.')).toBeInTheDocument();
  });

  it('says it could not load practices when the read fails', async () => {
    renderOverview(null);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load practices.');
  });
});
