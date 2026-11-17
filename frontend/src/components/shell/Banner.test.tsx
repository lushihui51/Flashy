// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WifiOff } from 'lucide-react';
import Banner from 'src/components/shell/Banner';

describe('Banner', () => {
  it('draws its words with role status, with an icon only when given one', () => {
    const { unmount } = render(<Banner color="ink">Words said.</Banner>);
    const plain = screen.getByRole('status');
    expect(plain).toHaveTextContent('Words said.');
    expect(plain.querySelector('svg')).toBeNull();
    unmount();

    render(
      <Banner color="wrong" Icon={WifiOff}>
        Words of a failure.
      </Banner>,
    );
    const withIcon = screen.getByRole('status');
    expect(withIcon).toHaveTextContent('Words of a failure.');
    expect(withIcon.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
