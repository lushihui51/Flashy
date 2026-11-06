// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRef, useState, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { useViewParams, type ViewTargets } from 'src/lib/viewParams';

function WriteStub() {
  const { setParams } = useViewParams();
  return (
    <button type="button" onClick={() => setParams(new URLSearchParams('tab=decks'))}>
      Write
    </button>
  );
}

// jsdom does no layout, so an element's `data-rect="top,bottom"` stands for its rect.
function rectOf(element: Element): DOMRect {
  const [top = 0, bottom = 0] = (element.getAttribute('data-rect') ?? '0,0').split(',').map(Number);
  return {
    top,
    bottom,
    height: bottom - top,
    y: top,
    x: 0,
    left: 0,
    right: 0,
    width: 0,
    toJSON: () => ({}),
  };
}

type RevealStubProps = {
  /** Whether the list element is on screen from the start; false makes the Load button
   * bring it. */
  listReady?: boolean;
  controlRect?: string;
  /** When set, Write calls changeView twice, the second time with a control at this rect. */
  secondControlRect?: string;
  rows: ReactNode;
  clears?: ReactNode;
};

function RevealStub({
  listReady = true,
  controlRect = '600,640',
  secondControlRect,
  rows,
  clears,
}: RevealStubProps) {
  const { params, changeView } = useViewParams();
  const [ready, setReady] = useState(listReady);
  const controlRef = useRef<HTMLButtonElement>(null);
  const secondControlRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listStart = () => listRef.current;
  const targets: ViewTargets = { control: () => controlRef.current, listStart };
  const secondTargets: ViewTargets = { control: () => secondControlRef.current, listStart };
  const next = new URLSearchParams('tab=decks');
  return (
    <>
      {clears}
      <button
        ref={controlRef}
        type="button"
        data-rect={controlRect}
        onClick={() => {
          changeView(next, targets);
          if (secondControlRect) changeView(next, secondTargets);
        }}
      >
        Write
      </button>
      {secondControlRect && (
        <button ref={secondControlRef} type="button" data-rect={secondControlRect}>
          Second control
        </button>
      )}
      <button type="button" onClick={() => setReady(true)}>
        Load
      </button>
      {params.get('tab') === 'decks' && ready && <div ref={listRef}>{rows}</div>}
    </>
  );
}

function mountAtLibrary(element: ReactNode) {
  const router = createMemoryRouter([{ path: '/library', element }], {
    initialEntries: ['/library'],
  });
  render(<RouterProvider router={router} />);
  return router;
}

describe('useViewParams', () => {
  it('setParams replaces the entry, writes the params and asks for no scroll reset', async () => {
    const router = mountAtLibrary(<WriteStub />);

    await userEvent.click(screen.getByRole('button', { name: 'Write' }));

    expect(router.state.location.search).toBe('?tab=decks');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(router.state.preventScrollReset).toBe(true);
  });

  describe('changeView', () => {
    let scrollBy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      vi.stubGlobal('innerHeight', 500);
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: Element,
      ) {
        return rectOf(this);
      });
      scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    const twoRows = (
      <>
        <div data-rect="650,690" />
        <div data-rect="700,740" />
      </>
    );

    it('writes like setParams and scrolls once, by the reveal delta, only once listStart gives the list', async () => {
      const router = mountAtLibrary(<RevealStub listReady={false} rows={twoRows} />);

      await userEvent.click(screen.getByRole('button', { name: 'Write' }));
      expect(router.state.location.search).toBe('?tab=decks');
      expect(router.state.historyAction).toBe('REPLACE');
      expect(router.state.preventScrollReset).toBe(true);
      expect(scrollBy).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole('button', { name: 'Load' }));
      // The control at 600-640 and the rows down to 740 fit the band; the bottom lands on
      // the viewport's 500.
      expect(scrollBy).toHaveBeenCalledTimes(1);
      expect(scrollBy).toHaveBeenCalledWith(0, 240);
    });

    it('takes the band top from the greatest stuck bottom of the marked elements', async () => {
      mountAtLibrary(
        <RevealStub
          controlRect="100,140"
          rows={
            <>
              <div data-rect="150,190" />
              <div data-rect="200,240" />
            </>
          }
          clears={
            <>
              <div data-reveal-clear style={{ top: '0px' }} data-rect="0,114" />
              <div data-reveal-clear style={{ top: '114px' }} data-rect="900,956" />
            </>
          }
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Write' }));

      // 114 + 56 = 170, from the row's stuck place, not its current edges at 900.
      expect(scrollBy).toHaveBeenCalledTimes(1);
      expect(scrollBy).toHaveBeenCalledWith(0, 100 - 170);
    });

    it('lowers the band bottom to the top of a marked element stuck at the foot', async () => {
      vi.stubGlobal('innerHeight', 844);
      mountAtLibrary(
        <RevealStub
          rows={
            <>
              <div data-rect="650,700" />
              <div data-rect="750,800" />
            </>
          }
          clears={<div data-reveal-clear style={{ bottom: '0px' }} data-rect="754,844" />}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Write' }));

      // The row ends at 800, inside the viewport's 844 but behind the bar from 754.
      expect(scrollBy).toHaveBeenCalledTimes(1);
      expect(scrollBy).toHaveBeenCalledWith(0, 800 - 754);
    });

    it('reads an element with both a top and a bottom as the foot, raising the band top by nothing', async () => {
      vi.stubGlobal('innerHeight', 844);
      mountAtLibrary(
        <RevealStub
          controlRect="-40,0"
          rows={
            <>
              <div data-rect="10,50" />
              <div data-rect="60,100" />
            </>
          }
          clears={
            <div data-reveal-clear style={{ top: '754px', bottom: '0px' }} data-rect="754,844" />
          }
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Write' }));

      // The control lands on 0, the band's top with nothing stuck there.
      expect(scrollBy).toHaveBeenCalledTimes(1);
      expect(scrollBy).toHaveBeenCalledWith(0, -40);
    });

    it('measures the first two marked rows, not the groups around them', async () => {
      mountAtLibrary(
        <RevealStub
          controlRect="560,600"
          rows={
            <>
              <div data-rect="600,700">
                <div data-reveal-row data-rect="600,650" />
                <div data-reveal-row data-rect="650,700" />
              </div>
              <div data-rect="700,800">
                <div data-reveal-row data-rect="700,750" />
                <div data-reveal-row data-rect="750,800" />
              </div>
            </>
          }
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Write' }));

      // The rows end at 700; the groups would end at 800.
      expect(scrollBy).toHaveBeenCalledTimes(1);
      expect(scrollBy).toHaveBeenCalledWith(0, 700 - 500);
    });

    it('scrolls a fractional delta by the whole pixel that keeps the top at or below the band', async () => {
      mountAtLibrary(
        <RevealStub
          controlRect="113.5,151.5"
          rows={
            <>
              <div data-rect="160,220" />
              <div data-rect="230,290" />
            </>
          }
          clears={<div data-reveal-clear style={{ top: '0px' }} data-rect="0,114" />}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Write' }));

      // -0.5 exactly; the whole pixel above, 0, would leave the top half a pixel under the band.
      expect(scrollBy).toHaveBeenCalledTimes(1);
      expect(scrollBy).toHaveBeenCalledWith(0, -1);
    });

    it('scrolls a fractional delta by the whole pixel above when the top stays below the band', async () => {
      mountAtLibrary(
        <RevealStub
          rows={
            <>
              <div data-rect="650,690" />
              <div data-rect="700,740.5" />
            </>
          }
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Write' }));

      // 240.5 exactly; 241 puts the bottom in view and leaves the control's top at 359.
      expect(scrollBy).toHaveBeenCalledTimes(1);
      expect(scrollBy).toHaveBeenCalledWith(0, 241);
    });

    it('measures only the targets of a second changeView made before the commit', async () => {
      mountAtLibrary(<RevealStub secondControlRect="800,840" rows={twoRows} />);

      await userEvent.click(screen.getByRole('button', { name: 'Write' }));

      // The second control ends at 840; the first would have left the bottom at 740.
      expect(scrollBy).toHaveBeenCalledTimes(1);
      expect(scrollBy).toHaveBeenCalledWith(0, 840 - 500);
    });
  });
});
