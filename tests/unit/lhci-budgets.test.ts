import { describe, expect, it } from 'vitest';
import { budgetProblems, firstRenderScriptBytes, type LhrLike } from '../../scripts/lhci-budgets';

const lhr = (dcl: number, scripts: Array<[number, number]>, url = 'http://x/'): LhrLike => ({
  finalDisplayedUrl: url,
  audits: {
    metrics: { details: { items: [{ observedDomContentLoaded: dcl }] } },
    'network-requests': {
      details: {
        items: [
          ...scripts.map(([end, size]) => ({
            resourceType: 'Script',
            transferSize: size,
            networkEndTime: end,
          })),
          { resourceType: 'Font', transferSize: 99999, networkEndTime: 1 },
        ],
      },
    },
  },
});

describe('first-render JS budget', () => {
  it('counts only scripts that finished by DOMContentLoaded', () => {
    expect(
      firstRenderScriptBytes(
        lhr(400, [
          [100, 3000],
          [399, 2000],
          [450, 56000],
        ]),
      ),
    ).toBe(5000);
  });

  it('passes within the budget and names the page when over', () => {
    expect(budgetProblems([lhr(400, [[100, 9000]])])).toEqual([]);
    const problems = budgetProblems([lhr(400, [[100, 12000]], 'http://x/en/')]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/http:\/\/x\/en\//);
  });

  it('refuses a result without timing data instead of passing silently', () => {
    expect(() => firstRenderScriptBytes({ audits: {} })).toThrow();
  });
});
