// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { renderWithRouter } from 'src/test/testUtils';
import ListRow from 'src/components/ui/ListRow';

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

describe('ListRow', () => {
  it('renders title, subtitle, and meta in the expected structure', () => {
    renderWithRouter(<ListRow title="Algebra" subtitle="Front, Back" meta="6 cards" to="/decks/d1" />);

    const row = screen.getByRole('link', { name: /Algebra/ });
    expect(row).toHaveTextContent('Algebra');
    expect(row).toHaveTextContent('Front, Back');
    expect(row).toHaveTextContent('6 cards');
  });

  it('renders no subtitle element at all when subtitle is omitted', () => {
    renderWithRouter(<ListRow title="Cells" meta="3 cards" to="/decks/d2" />);

    const row = screen.getByRole('link', { name: /Cells/ });
    // only one text node under the text column (the title) — no empty/placeholder
    // subtitle span rendered.
    expect(row.querySelectorAll('span > span')).toHaveLength(1);
  });

  it('rows with and without a subtitle share the same min-height class', () => {
    const { container: withSub } = renderWithRouter(
      <ListRow title="Algebra" subtitle="Front, Back" meta="6 cards" to="/decks/d1" />,
    );
    const { container: withoutSub } = renderWithRouter(
      <ListRow title="Cells" meta="3 cards" to="/decks/d2" />,
    );

    const rowWith = withSub.querySelector('a')!;
    const rowWithout = withoutSub.querySelector('a')!;
    expect(rowWith.className).toMatch(/min-h-16/);
    expect(rowWithout.className).toMatch(/min-h-16/);
  });

  it('meta is not truncated (no truncate class) while subtitle is', () => {
    renderWithRouter(
      <ListRow
        title="Algebra"
        subtitle="A very long subtitle that should ellipsis instead of wrapping or pushing meta off the row"
        meta="6 cards"
        to="/decks/d1"
      />,
    );

    const row = screen.getByRole('link', { name: /Algebra/ });
    const subtitleEl = screen.getByText(/A very long subtitle/);
    const metaEl = screen.getByText('6 cards');
    expect(subtitleEl.className).toMatch(/truncate/);
    expect(metaEl.className).not.toMatch(/truncate/);
    expect(row).toBeInTheDocument();
  });

  it('navigates to `to` when clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <>
        <ListRow title="Algebra" to="/decks/d1" />
        <LocationProbe />
      </>,
    );

    await user.click(screen.getByRole('link', { name: 'Algebra' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/decks/d1');
  });

  it('navigates when tabbed to and activated with Enter', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <>
        <ListRow title="Algebra" to="/decks/d1" />
        <LocationProbe />
      </>,
    );

    await user.tab();
    expect(screen.getByRole('link', { name: 'Algebra' })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(screen.getByTestId('location')).toHaveTextContent('/decks/d1');
  });

  it('the chevron is decorative and not independently focusable', () => {
    renderWithRouter(<ListRow title="Algebra" to="/decks/d1" />);

    const row = screen.getByRole('link', { name: 'Algebra' });
    const chevron = row.querySelector('svg');
    expect(chevron).toHaveAttribute('aria-hidden', 'true');
    // the row itself is the only focusable/interactive element — one link, no
    // nested button/link for the chevron.
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('keys by whatever the caller passes as key — smoke test rendering a list', () => {
    renderWithRouter(
      <ul>
        {[
          { id: 'a', title: 'Algebra' },
          { id: 'b', title: 'Geometry' },
        ].map((deck) => (
          <ListRow key={deck.id} title={deck.title} to={`/decks/${deck.id}`} />
        ))}
      </ul>,
    );

    expect(screen.getByRole('link', { name: 'Algebra' })).toHaveAttribute('href', '/decks/a');
    expect(screen.getByRole('link', { name: 'Geometry' })).toHaveAttribute('href', '/decks/b');
  });

  describe('onClick mode (Phase 4)', () => {
    it('renders a button, not a link, and fires the handler on click', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      renderWithRouter(<ListRow title="Card 1" onClick={onClick} />);

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      const row = screen.getByRole('button', { name: 'Card 1' });
      await user.click(row);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('fires the handler on Enter', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      renderWithRouter(<ListRow title="Card 1" onClick={onClick} />);

      await user.tab();
      expect(screen.getByRole('button', { name: 'Card 1' })).toHaveFocus();
      await user.keyboard('{Enter}');

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});
