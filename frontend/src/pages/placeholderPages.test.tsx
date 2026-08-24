// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from 'src/pages/HomePage';
import LibraryPage from 'src/pages/LibraryPage';
import PracticePage from 'src/pages/PracticePage';
import NotificationsPage from 'src/pages/NotificationsPage';

describe('placeholder pages', () => {
  it.each([
    ['HomePage', HomePage, 'Home'],
    ['LibraryPage', LibraryPage, 'Your library'],
    ['PracticePage', PracticePage, 'Practice'],
    ['NotificationsPage', NotificationsPage, 'Notifications'],
  ] as const)('%s smoke renders with an <h1>', (_name, Page, heading) => {
    render(<Page />);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });
});
