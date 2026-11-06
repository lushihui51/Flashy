// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KeyButton from 'src/components/ui/KeyButton';

describe('KeyButton', () => {
  it('is a plain button spoken "Key"', () => {
    render(<KeyButton open={false} onClick={() => {}} />);

    expect(screen.getByRole('button', { name: 'Key' })).toHaveAttribute('type', 'button');
  });

  it('calls onClick when pressed', async () => {
    const onClick = vi.fn();
    render(<KeyButton open={false} onClick={onClick} />);

    await userEvent.click(screen.getByRole('button', { name: 'Key' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('closed, has a surface face and an ink "i"', () => {
    const { container } = render(<KeyButton open={false} onClick={() => {}} />);

    expect(screen.getByRole('button', { name: 'Key' })).toHaveAttribute('aria-expanded', 'false');
    const [shadow, face, dot] = container.querySelectorAll('circle');
    expect(shadow).toHaveAttribute('fill', 'var(--color-ink)');
    expect(shadow).toHaveAttribute('cy', '15');
    expect(face).toHaveAttribute('fill', 'var(--color-surface)');
    expect(face).toHaveAttribute('cy', '13');
    expect(face).toHaveAttribute('stroke', 'var(--color-ink)');
    expect(dot).toHaveAttribute('fill', 'var(--color-ink)');
    expect(container.querySelector('path')).toHaveAttribute('stroke', 'var(--color-ink)');
  });

  it('open, has an ink face and a surface "i"', () => {
    const { container } = render(<KeyButton open onClick={() => {}} />);

    expect(screen.getByRole('button', { name: 'Key' })).toHaveAttribute('aria-expanded', 'true');
    const [shadow, face, dot] = container.querySelectorAll('circle');
    expect(shadow).toHaveAttribute('fill', 'var(--color-ink)');
    expect(face).toHaveAttribute('fill', 'var(--color-ink)');
    expect(dot).toHaveAttribute('fill', 'var(--color-surface)');
    expect(container.querySelector('path')).toHaveAttribute('stroke', 'var(--color-surface)');
  });

  it('holds one svg, sized by classes in rem on a fixed viewBox', () => {
    const { container } = render(<KeyButton open={false} onClick={() => {}} />);

    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(1);
    expect(svgs[0]).toHaveAttribute('viewBox', '0 0 26 28');
    expect(svgs[0]).toHaveClass('w-[1.625rem]', 'h-[1.75rem]');
  });
});
