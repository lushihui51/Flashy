// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithRouter } from 'src/test/testUtils';
import Breadcrumb from 'src/components/ui/Breadcrumb';

describe('Breadcrumb', () => {
  it('renders each place as a link to its address, in order, inside a navigation named Breadcrumb', () => {
    renderWithRouter(
      <Breadcrumb
        places={[
          { label: 'Your library', to: '/library' },
          { label: 'French', to: '/subjects/s1' },
        ]}
      />,
    );

    const row = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const links = within(row).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Your library', 'French']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/library', '/subjects/s1']);
  });

  it('puts one separator between places and none before the first', () => {
    renderWithRouter(
      <Breadcrumb
        places={[
          { label: 'Your library', to: '/library' },
          { label: 'French', to: '/subjects/s1' },
          { label: 'Vocab', to: '/decks/d1' },
        ]}
      />,
    );

    const row = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(row).toHaveTextContent(/^Your library›French›Vocab$/);
  });

  it("renders a place's icon inside its link", () => {
    renderWithRouter(
      <Breadcrumb
        places={[
          { label: 'Your library', to: '/library' },
          { label: 'French', to: '/subjects/s1', icon: <svg data-testid="subject-icon" /> },
        ]}
      />,
    );

    const link = screen.getByRole('link', { name: 'French' });
    expect(within(link).getByTestId('subject-icon')).toBeInTheDocument();
    expect(link.firstChild).toBe(screen.getByTestId('subject-icon'));
  });

  it('renders a single place with no separator', () => {
    renderWithRouter(<Breadcrumb places={[{ label: 'Practice', to: '/practice' }]} />);

    const row = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(row).getByRole('link', { name: 'Practice' })).toHaveAttribute(
      'href',
      '/practice',
    );
    expect(row).toHaveTextContent(/^Practice$/);
  });
});
