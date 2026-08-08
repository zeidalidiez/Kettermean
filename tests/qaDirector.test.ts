import { describe, expect, it } from 'vitest';
import {
  browserQaPrompt,
  extractNumberedAnswers,
  parseQaDirection,
} from '../src/world/qaDirector';

describe('browser-model answer parser', () => {
  it('keeps the final answer in the standard five-line form', () => {
    const answers = extractNumberedAnswers(
      '1. wrong_nursery\n2. Quiet Crib\n3. downer\n4. no\n5. The mobile turns alone.',
    );
    expect([...answers.entries()]).toEqual([
      [1, 'wrong_nursery'],
      [2, 'Quiet Crib'],
      [3, 'downer'],
      [4, 'no'],
      [5, 'The mobile turns alone.'],
    ]);
  });

  it('parses compact single-line and Q-prefixed answers', () => {
    const answers = extractNumberedAnswers(
      'Q1: dry_pool Q2: Empty Lanes Q3: static Q4: no Q5: The tiles remember water.',
    );
    expect(answers.size).toBe(5);
    expect(answers.get(5)).toBe('The tiles remember water.');
  });

  it('preserves answers inside markdown fences and builds a direction', () => {
    const direction = parseQaDirection(
      '```text\n1. soft_clinic\n2. Night Intake\n3. static\n4. no\n5. No one calls your name.\n```',
      'fenced-answer',
    );
    expect(direction?.title).toBe('Night Intake');
    expect(direction?.blurb).toContain('No one calls your name.');
  });

  it('extracts the dedicated fenced record and ignores surrounding prompt echoes', () => {
    const direction = parseQaDirection(
      `2. short title (2-5 words)

\`\`\`kettermean
THEME_ID=dry_pool
TITLE=Waterless Lanes
MOOD=static
GIANT=no
BLURB=The depth markers point into dust.
\`\`\`

5. one short blurb sentence`,
      'fenced-record',
    );

    expect(direction?.title).toBe('Waterless Lanes');
    expect(direction?.blurb).toContain('The depth markers point into dust.');
  });

  it('rejects an echoed questionnaire instead of displaying instructions', () => {
    const direction = parseQaDirection(
      `1. themeId exactly one of: fluorescent_lobby, dry_pool
2. short title (2-5 words)
3. mood exactly one of: upper, downer, static, dynamic
4. giant baby? yes or no
5. one short blurb sentence`,
      'echoed-questionnaire',
    );

    expect(direction).toBeNull();
  });

  it('rejects placeholders even when the model puts them in the requested block', () => {
    const direction = parseQaDirection(
      `\`\`\`kettermean
THEME_ID=<one allowed theme id>
TITLE=<invented atmospheric title>
MOOD=<upper, downer, static, or dynamic>
GIANT=<yes or no>
BLURB=<invented atmospheric sentence>
\`\`\``,
      'copied-placeholders',
    );

    expect(direction).toBeNull();
  });

  it('keeps any usable model fields and reports only the procedural replacements', () => {
    const fallbackFields: string[] = [];
    const direction = parseQaDirection(
      `\`\`\`kettermean
THEME_ID=<one allowed theme id>
TITLE=<invented atmospheric title>
MOOD=<upper, downer, static, or dynamic>
GIANT=<yes or no>
BLURB=Only the exit sign remembers your name.
\`\`\``,
      'partial-record',
      undefined,
      (fields) => fallbackFields.push(...fields),
    );

    expect(direction).not.toBeNull();
    expect(direction?.offline).toBe(false);
    expect(direction?.blurb).toContain('Only the exit sign remembers your name.');
    expect(fallbackFields).toEqual(['THEME_ID', 'TITLE', 'MOOD', 'GIANT']);
  });

  it('rejects a prose echo of the seed, mood, and theme allow-list', () => {
    const direction = parseQaDirection(
      `Seed humid-nursery-46:d5a41ea5
Mood preference: static
Titles to avoid: Held Parking Level B2
Allowed THEME_ID values: fluorescent_lobby, wrong_nursery, dry_pool, violet_server`,
      'prompt-echo',
    );

    expect(direction).toBeNull();
  });

  it('accepts a complete room record returned as a Markdown table', () => {
    const fallbackFields: string[] = [];
    const direction = parseQaDirection(
      `\`\`\`markdown
| THEME_ID | TITLE | MOOD | GIANT | BLURB |
|---|---|---|---|---|
| violet_server | The Violet Vault | static | yes | The air is thick with the scent of ozone. |
\`\`\``,
      'markdown-table',
      undefined,
      (fields) => fallbackFields.push(...fields),
    );

    expect(direction?.title).toBe('The Violet Vault');
    expect(direction?.blurb).toContain('The air is thick with the scent of ozone.');
    expect(direction?.offline).toBe(false);
    expect(fallbackFields).toEqual([]);
  });

  it('salvages values beneath Markdown-style field headings', () => {
    const fallbackFields: string[] = [];
    const direction = parseQaDirection(
      `\`\`\`markdown
= THEME_ID =
= TITLE =
Parking Lot, Overcast Day

= MOOD =
Downer

= GIANT =
No

= BLURB =
The parking lot is a vast expanse of concrete and metal, each car a silent sentinel.
\`\`\``,
      'markdown-headings',
      undefined,
      (fields) => fallbackFields.push(...fields),
    );

    expect(direction?.title).toBe('Parking Lot, Overcast Day');
    expect(direction?.mood).toBe('downer');
    expect(direction?.blurb).toContain('The parking lot is a vast expanse');
    expect(direction?.offline).toBe(false);
    expect(fallbackFields).toEqual(['THEME_ID']);
  });

  it('asks for one delimited record without providing a copyable answer skeleton', () => {
    const prompt = browserQaPrompt({
      seed: 'prompt-format',
      moodBias: 'static',
      previousTitles: [],
      allowGore: false,
    });

    const fullPrompt = `${prompt.system}\n${prompt.user}`;
    expect(fullPrompt).toContain('kettermean');
    expect(fullPrompt).not.toMatch(
      /^\s*(?:THEME_ID|TITLE|MOOD|GIANT|BLURB)\s*=/gm,
    );
    expect(fullPrompt).not.toMatch(/<[^>]+>/);
    expect(prompt.system).not.toContain('Quiet Lobby');
    expect(prompt.user).not.toMatch(/^\s*2[.:)]\s*short title/gm);

    const themeLine = prompt.user
      .split('\n')
      .find((line) => line.startsWith('Theme options: '));
    const themeIds = themeLine
      ?.replace(/^Theme options:\s*/, '')
      .replace(/\.$/, '')
      .split(', ');
    expect(themeIds).toHaveLength(5);
    expect(new Set(themeIds).size).toBe(5);
    expect(browserQaPrompt({
      seed: 'prompt-format',
      moodBias: 'static',
      previousTitles: [],
      allowGore: false,
    })).toEqual(prompt);
  });
});
