import { describe, it, expect } from 'vitest';

// Pure business logic — no DB needed

describe('FPY calculation logic', () => {
  /** Worker FPY = (output - defects) / output * 100 */
  function fpy(output: number, defects: number): number | null {
    if (output === 0) return null;
    return +(100 * (output - defects) / output).toFixed(1);
  }

  it('100 output, 5 defects → 95.0%', () => {
    expect(fpy(100, 5)).toBe(95.0);
  });

  it('100 output, 100 defects → 0.0%', () => {
    expect(fpy(100, 100)).toBe(0.0);
  });

  it('100 output, 0 defects → 100.0%', () => {
    expect(fpy(100, 0)).toBe(100.0);
  });

  it('zero output → null (no production, undefined yield)', () => {
    expect(fpy(0, 0)).toBeNull();
  });

  it('200 defects, 100 output → negative %, data error visible', () => {
    const r = fpy(100, 200);
    expect(r).toBe(-100.0); // No clamping — exposes data entry error
  });
});

describe('Section FPY = product of station FPYs', () => {
  function sectionFpy(stationRatios: number[]): number {
    if (stationRatios.length === 0) return 100;
    const product = stationRatios.reduce((p, r) => p * (r / 100), 1);
    return +(product * 100).toFixed(1);
  }

  it('two stations each 90% → 81.0%', () => {
    expect(sectionFpy([90, 90])).toBe(81.0);
  });

  it('three stations 95%, 98%, 90% → 83.8%', () => {
    expect(sectionFpy([95, 98, 90])).toBe(83.8);
  });

  it('one station 0% → 0%', () => {
    expect(sectionFpy([0])).toBe(0);
  });

  it('empty stations → 100%', () => {
    expect(sectionFpy([])).toBe(100);
  });
});

describe('Trend aggregation: day→week', () => {
  function weekKey(date: string): string {
    const d = new Date(date + 'T00:00:00');
    // ISO week
    const jan4 = new Date(d.getFullYear(), 0, 4);
    const diff = d.getTime() - jan4.getTime();
    return String(Math.floor(diff / (7 * 86400 * 1000)) + 1) + 'W';
  }

  it('groups consecutive days into same week', () => {
    const w1 = weekKey('2026-06-01');
    const w2 = weekKey('2026-06-02');
    const w3 = weekKey('2026-06-08');
    expect(w1).toBe(w2);   // same week
    expect(w1).not.toBe(w3); // different week
  });
});

describe('Defect rate as % of true total', () => {
  function defectRate(count: number, trueTotal: number): number {
    if (trueTotal <= 0) return 0;
    return +(count / trueTotal * 100).toFixed(1);
  }

  it('50 defects out of 500 total → 10.0%', () => {
    expect(defectRate(50, 500)).toBe(10.0);
  });

  it('handles zero total', () => {
    expect(defectRate(50, 0)).toBe(0);
  });
});

describe('Granularity week sorting', () => {
  function sortWeekKeys(keys: number[]): number[] {
    return [...keys].sort((a, b) => a - b);
  }

  it('sorts week numbers ascending', () => {
    expect(sortWeekKeys([5, 1, 10])).toEqual([1, 5, 10]);
  });
});

describe('Granularity month sorting', () => {
  function sortMonthKeys(keys: string[]): string[] {
    return [...keys].sort((a, b) => a.localeCompare(b));
  }

  it('sorts months chronologically', () => {
    expect(sortMonthKeys(['2026-03', '2026-01', '2026-02']))
      .toEqual(['2026-01', '2026-02', '2026-03']);
  });
});
