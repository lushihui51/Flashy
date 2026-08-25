// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithRouter } from 'src/test/testUtils';
import PracticeCreatePage from 'src/pages/PracticeCreatePage';

function renderCreate(path = '/practice/new') {
  return renderWithRouter(
    <Routes>
      <Route path="/practice/new" element={<PracticeCreatePage />} />
    </Routes>,
    [path],
  );
}

describe('PracticeCreatePage', () => {
  it('smoke renders with an <h1>', () => {
    renderCreate();
    expect(screen.getByRole('heading', { level: 1, name: 'New practice' })).toBeInTheDocument();
  });

  it('links to the config builder and the config list, keeping the filters it arrived with', () => {
    renderCreate('/practice/new?subject=s1&deck=d1');

    expect(screen.getByRole('link', { name: 'New practice config' })).toHaveAttribute(
      'href',
      '/practice/configs/new?subject=s1&deck=d1',
    );
    expect(screen.getByRole('link', { name: 'Manage practice configs' })).toHaveAttribute(
      'href',
      '/practice/configs?subject=s1&deck=d1',
    );
  });
});
