// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { renderWithRouter } from 'src/test/testUtils';
import PracticeRunPage from 'src/pages/PracticeRunPage';

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderRun(practiceSessionId = 'ps1') {
  return renderWithRouter(
    <Routes>
      <Route path="/practice/:practiceSessionId/run" element={<PracticeRunPage />} />
      <Route path="/practice/:practiceSessionId" element={<LocationProbe />} />
    </Routes>,
    [`/practice/${practiceSessionId}/run`],
  );
}

describe('PracticeRunPage', () => {
  it('renders the stub heading and body', () => {
    renderRun();

    expect(screen.getByRole('heading', { name: 'Practice run' })).toBeInTheDocument();
    expect(screen.getByText('Coming soon.')).toBeInTheDocument();
  });

  it('shows a breadcrumb back to its own session, for whichever id is in the URL', async () => {
    const user = userEvent.setup();
    renderRun('ps9');

    const crumb = screen.getByRole('link', { name: 'Practice session' });
    await user.click(crumb);

    expect(screen.getByTestId('location')).toHaveTextContent('/practice/ps9');
  });
});
