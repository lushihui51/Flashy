import { describe, expect, it } from 'vitest';
import { revealDelta } from 'src/lib/revealDelta';

const BAND_TOP = 114;
const BAND_BOTTOM = 500;

describe('revealDelta', () => {
  it('gives 0 when the control and the rows are all in view', () => {
    expect(
      revealDelta({
        bandTop: BAND_TOP,
        bandBottom: BAND_BOTTOM,
        control: { top: 120, bottom: 160 },
        rows: [
          { top: 170, bottom: 230 },
          { top: 240, bottom: 300 },
        ],
      }),
    ).toBe(0);
  });

  it('lands the top of targets above the band on bandTop', () => {
    expect(
      revealDelta({
        bandTop: BAND_TOP,
        bandBottom: BAND_BOTTOM,
        control: { top: 40, bottom: 80 },
        rows: [
          { top: 90, bottom: 150 },
          { top: 160, bottom: 220 },
        ],
      }),
    ).toBe(40 - BAND_TOP);
  });

  it('lands the bottom of targets below the band on bandBottom', () => {
    expect(
      revealDelta({
        bandTop: BAND_TOP,
        bandBottom: BAND_BOTTOM,
        control: { top: 400, bottom: 440 },
        rows: [
          { top: 450, bottom: 510 },
          { top: 520, bottom: 580 },
        ],
      }),
    ).toBe(580 - BAND_BOTTOM);
  });

  it('lands the control on bandTop when the targets do not fit the band', () => {
    expect(
      revealDelta({
        bandTop: BAND_TOP,
        bandBottom: BAND_BOTTOM,
        control: { top: 400, bottom: 440 },
        rows: [
          { top: 450, bottom: 650 },
          { top: 660, bottom: 860 },
        ],
      }),
    ).toBe(400 - BAND_TOP);
  });

  it('reveals the control alone with no rows, and gives 0 with no control either', () => {
    expect(
      revealDelta({
        bandTop: BAND_TOP,
        bandBottom: BAND_BOTTOM,
        control: { top: 600, bottom: 640 },
        rows: [],
      }),
    ).toBe(640 - BAND_BOTTOM);
    expect(
      revealDelta({ bandTop: BAND_TOP, bandBottom: BAND_BOTTOM, control: null, rows: [] }),
    ).toBe(0);
  });

  it('reveals the rows alone with no control', () => {
    expect(
      revealDelta({
        bandTop: BAND_TOP,
        bandBottom: BAND_BOTTOM,
        control: null,
        rows: [
          { top: 20, bottom: 80 },
          { top: 90, bottom: 150 },
        ],
      }),
    ).toBe(20 - BAND_TOP);
    expect(
      revealDelta({
        bandTop: BAND_TOP,
        bandBottom: BAND_BOTTOM,
        control: null,
        rows: [
          { top: 200, bottom: 500 },
          { top: 510, bottom: 810 },
        ],
      }),
    ).toBe(200 - BAND_TOP);
  });
});
