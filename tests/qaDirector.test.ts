import { describe, expect, it } from 'vitest';
import { extractNumberedAnswers, parseQaDirection } from '../src/world/qaDirector';

describe('browser-model numbered answer parser', () => {
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
});
