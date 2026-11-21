import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Stack Sans Notch (--f-name) is a display face: only allowed at font sizes that never drop below 64 px.
const MIN_PX = 64;
const ROOT = join(import.meta.dirname, '../../src/styles');

interface Rule {
  selector: string;
  decls: Map<string, string>;
}

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return cssFiles(path);
    return path.endsWith('.css') ? [path] : [];
  });
}

/** Flat rule list. Nested at-rules (@media, @layer) contribute their inner rules; no rule nests other rules. */
function parseRules(css: string): Rule[] {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: Rule[] = [];
  for (const [, selector, body] of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decls = new Map<string, string>();
    for (const decl of (body ?? '').split(';')) {
      const colon = decl.indexOf(':');
      if (colon > 0) decls.set(decl.slice(0, colon).trim().toLowerCase(), decl.slice(colon + 1).trim());
    }
    rules.push({ selector: (selector ?? '').trim(), decls });
  }
  return rules;
}

function resolveVars(value: string, tokens: Map<string, string>): string {
  let out = value;
  for (let i = 0; i < 5 && out.includes('var('); i++) {
    out = out.replace(/var\((--[\w-]+)\)/g, (m, name: string) => tokens.get(name) ?? m);
  }
  return out;
}

/** Problems (empty list = ok) for every rule that sets `font-family` through `var(--f-name)`. */
export function notchProblems(css: string, tokens: Map<string, string>): string[] {
  const problems: string[] = [];
  for (const { selector, decls } of parseRules(css)) {
    const usesNotch = [...decls].some(([prop, v]) => !prop.startsWith('--') && v.includes('var(--f-name)'));
    if (!usesNotch) continue;
    const size = decls.get('font-size');
    if (size === undefined) {
      problems.push(`${selector}: uses --f-name without an explicit font-size`);
      continue;
    }
    const resolved = resolveVars(size, tokens);
    const min = /^clamp\(\s*([\d.]+)px\s*,/.exec(resolved);
    if (!min) problems.push(`${selector}: font-size "${size}" is not clamp() with a px minimum`);
    else if (Number(min[1]) < MIN_PX) problems.push(`${selector}: clamp() minimum ${min[1]}px is below ${MIN_PX}px`);
  }
  return problems;
}

function loadTokens(): Map<string, string> {
  const tokens = new Map<string, string>();
  const css = readFileSync(join(ROOT, 'tokens.css'), 'utf8');
  for (const [, name, value] of css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) {
    if (name && value) tokens.set(name, value.trim());
  }
  return tokens;
}

describe('Stack Sans Notch only at >= 64 px', () => {
  const tokens = loadTokens();

  it('every stylesheet in src/styles obeys the rule', () => {
    const files = cssFiles(ROOT);
    expect(files.length).toBeGreaterThan(0);
    const problems = files.flatMap((file) => notchProblems(readFileSync(file, 'utf8'), tokens));
    expect(problems).toEqual([]);
  });

  it('the name token resolves to a clamp() with a minimum of at least 64 px', () => {
    expect(notchProblems('.name{font-family:var(--f-name);font-size:var(--t-name)}', tokens)).toEqual([]);
  });

  it('the checker rejects rules that would break the constraint', () => {
    const bad = [
      '.a{font-family:var(--f-name)}',
      '.b{font-family:var(--f-name);font-size:20px}',
      '.c{font-family:var(--f-name);font-size:clamp(40px,8vw,136px)}',
      '.d{font:700 80px/1 var(--f-name)}',
      '.e{font-family:var(--f-name);font-size:var(--t-h)}',
      '@media (min-width:600px){.f{font-family:var(--f-name);font-size:64px}}',
    ];
    for (const css of bad) expect(notchProblems(css, tokens), css).not.toEqual([]);
    expect(notchProblems('.ok{font-family:var(--f-name);font-size:clamp(64px,13vw,236px)}', tokens)).toEqual([]);
  });
});
