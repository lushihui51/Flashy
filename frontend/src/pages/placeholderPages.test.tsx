// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from 'src/pages/HomePage';
import NotificationsPage from 'src/pages/NotificationsPage';

// PracticeDetailsPage used to be a placeholder here too — Phase 4 filled it in with
// real data fetching (PracticeDetailsPage.test.tsx), so it no longer belongs on this
// list of stubs still waiting to be built.
describe('placeholder pages', () => {
  it.each([
    ['HomePage', HomePage, 'Home'],
    ['NotificationsPage', NotificationsPage, 'Notifications'],
  ] as const)('%s smoke renders with an <h1>', (_name, Page, heading) => {
    render(<Page />);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });
});
