// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { renderWithRouter } from 'src/test/testUtils';
import SearchBar from 'src/components/shell/SearchBar';

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

describe('SearchBar', () => {
  it('updates its value while typing', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SearchBar />);

    const input = screen.getByRole('searchbox');
    await user.type(input, 'mitochondria');

    expect(input).toHaveValue('mitochondria');
  });

  it('does not navigate or throw when Enter is pressed', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <>
        <SearchBar />
        <LocationProbe />
      </>,
      ['/library'],
    );

    const input = screen.getByRole('searchbox');
    await user.type(input, 'cards{Enter}');

    expect(screen.getByTestId('location')).toHaveTextContent('/library');
  });
});
