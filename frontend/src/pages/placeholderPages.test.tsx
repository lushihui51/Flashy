// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from 'src/pages/HomePage';
import PracticeDetailsPage from 'src/pages/PracticeDetailsPage';
import PracticeCreatePage from 'src/pages/PracticeCreatePage';
import NotificationsPage from 'src/pages/NotificationsPage';

describe('placeholder pages', () => {
  it.each([
    ['HomePage', HomePage, 'Home'],
    ['PracticeDetailsPage', PracticeDetailsPage, 'Practice session'],
    ['PracticeCreatePage', PracticeCreatePage, 'New practice'],
    ['NotificationsPage', NotificationsPage, 'Notifications'],
  ] as const)('%s smoke renders with an <h1>', (_name, Page, heading) => {
    render(<Page />);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });
});
