// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { renderWithRouter } from 'src/test/testUtils';
import CreateSheet from 'src/components/shell/CreateSheet';

const triggerRef = { current: null };

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderSheet(props: Partial<Parameters<typeof CreateSheet>[0]> = {}) {
  return renderWithRouter(
    <>
      <CreateSheet open onClose={() => {}} triggerRef={triggerRef} hasDecks {...props} />
      <LocationProbe />
    </>,
  );
}

describe('CreateSheet', () => {
  it('renders a drag handle and four rows', () => {
    renderSheet();

    expect(screen.getByRole('dialog', { name: 'Create' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subject' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deck' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Card' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deck configuration' })).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    renderSheet({ open: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes and navigates to /subjects/new when Subject is tapped', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderSheet({ onClose });

    await user.click(screen.getByRole('button', { name: 'Subject' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location')).toHaveTextContent('/subjects/new');
  });

  it('closes and navigates to /decks/new when Deck is tapped', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderSheet({ onClose });

    await user.click(screen.getByRole('button', { name: 'Deck' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location')).toHaveTextContent('/decks/new');
  });

  it('closes and navigates to the config builder when Deck configuration is tapped', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderSheet({ onClose, hasDecks: true });

    await user.click(screen.getByRole('button', { name: 'Deck configuration' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location')).toHaveTextContent('/deck-configurations/new');
  });

  it('closes and navigates to /cards/new when Card is tapped and decks exist', async () => {
    const user = userEvent.setup();
    renderSheet({ hasDecks: true });

    await user.click(screen.getByRole('button', { name: /^Card/ }));

    expect(screen.getByTestId('location')).toHaveTextContent('/cards/new');
  });

  it('shows "Create a deck first" and routes Card to /decks/new when there are no decks', async () => {
    const user = userEvent.setup();
    renderSheet({ hasDecks: false });

    expect(screen.getByText('Create a deck first')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Card/ }));

    expect(screen.getByTestId('location')).toHaveTextContent('/decks/new');
  });

  it('does not show the empty-state subline while decks are still loading (undefined)', () => {
    renderSheet({ hasDecks: undefined });

    expect(screen.queryByText('Create a deck first')).not.toBeInTheDocument();
  });

  it('calls onClose when the scrim is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderSheet({ onClose });

    await user.click(screen.getByTestId('scrim'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderSheet({ onClose });

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
