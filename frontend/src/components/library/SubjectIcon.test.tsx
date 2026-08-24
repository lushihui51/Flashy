// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import SubjectIcon from 'src/components/library/SubjectIcon';

describe('SubjectIcon', () => {
  it('renders an svg for a known identifier', () => {
    const { container } = render(<SubjectIcon icon="brain" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders the fallback svg for an unrecognized or missing identifier', () => {
    const { container } = render(<SubjectIcon icon={null} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('is hidden from the accessibility tree and forwards className', () => {
    const { container } = render(<SubjectIcon icon="atom" className="h-5 w-5" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('h-5', 'w-5');
  });
});
