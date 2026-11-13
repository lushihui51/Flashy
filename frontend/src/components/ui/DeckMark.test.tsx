// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DeckMark from 'src/components/ui/DeckMark';

describe('DeckMark', () => {
  it('is an image named "Deck"', () => {
    render(<DeckMark />);

    expect(screen.getByRole('img', { name: 'Deck' })).toBeInTheDocument();
  });

  it('draws a stack of two cards as an outline in the color of its words', () => {
    const { container } = render(<DeckMark />);

    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('stroke-width', '2');
    expect(svg).toHaveAttribute('stroke-linecap', 'round');
    expect(svg).toHaveAttribute('stroke-linejoin', 'round');

    const rect = container.querySelector('rect')!;
    expect(rect).toHaveAttribute('x', '3');
    expect(rect).toHaveAttribute('y', '7');
    expect(rect).toHaveAttribute('width', '14');
    expect(rect).toHaveAttribute('height', '14');
    expect(rect).toHaveAttribute('rx', '2');
    expect(container.querySelector('path')).toHaveAttribute('d', 'M7 3h12a2 2 0 0 1 2 2v12');
  });
});
