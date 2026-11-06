// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import PromptMark from 'src/components/ui/PromptMark';

describe('PromptMark', () => {
  it('draws shown as a solid ink dot', () => {
    const { container } = render(<PromptMark shown />);

    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(1);
    expect(circles[0]).toHaveAttribute('r', '6.5');
    expect(circles[0]).toHaveAttribute('fill', 'var(--color-ink)');
  });

  it('draws not shown as an empty line-coloured ring', () => {
    const { container } = render(<PromptMark shown={false} />);

    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(1);
    expect(circles[0]).toHaveAttribute('r', '5.75');
    expect(circles[0]).toHaveAttribute('fill', 'none');
    expect(circles[0]).toHaveAttribute('stroke', 'var(--color-line)');
    expect(circles[0]).toHaveAttribute('stroke-width', '1.5');
  });

  it('is silent, sized by a class in rem on a fixed viewBox', () => {
    const { container } = render(<PromptMark shown />);

    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('viewBox', '0 0 13 13');
    expect(svg).toHaveClass('size-[0.8125rem]');
  });
});
