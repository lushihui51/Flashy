// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Tabs from 'src/components/ui/Tabs';

const items = [
  { value: 'subjects', label: 'Subjects' },
  { value: 'decks', label: 'Decks' },
] as const;

function renderTabs(onChange: (value: 'subjects' | 'decks') => void = () => {}) {
  render(<Tabs ariaLabel="Library" items={[...items]} value="subjects" onChange={onChange} />);
}

describe('Tabs', () => {
  it('renders a labelled tablist with one tab per item, in order', () => {
    renderTabs();

    expect(screen.getByRole('tablist', { name: 'Library' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Subjects', 'Decks']);
  });

  it('marks only the chosen tab selected', () => {
    renderTabs();

    expect(screen.getByRole('tab', { name: 'Subjects' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Decks' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with the value of the tab tapped', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderTabs(onChange);

    await user.click(screen.getByRole('tab', { name: 'Decks' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('decks');
  });
});
