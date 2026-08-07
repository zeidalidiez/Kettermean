/** Mulberry32 + string hashing for deterministic room generation. */

export function hashString(input: string): number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i += 1) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export class SeededRng {
  private state: number;

  constructor(seed: string | number) {
    this.state = typeof seed === 'number' ? seed >>> 0 : hashString(seed);
    if (this.state === 0) this.state = 0x9e3779b9;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  float(min = 0, max = 1): number {
    return min + (max - min) * this.next();
  }

  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1));
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from empty list');
    }
    return items[this.int(0, items.length - 1)]!;
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  color(sat = 0.35, light = 0.45): string {
    const h = this.float(0, 360);
    return `hsl(${h.toFixed(1)} ${Math.round(sat * 100)}% ${Math.round(light * 100)}%)`;
  }
}

export function childSeed(parent: string, salt: string | number): string {
  const h = hashString(`${parent}::${salt}`);
  return `${parent.split(':')[0]}:${h.toString(16)}`;
}

export function randomSeed(): string {
  const adjectives = [
    'yellow',
    'humid',
    'quiet',
    'wrong',
    'soft',
    'empty',
    ' orth',
    'pale',
    'late',
    'narrow',
  ];
  const nouns = [
    'hallway',
    'lobby',
    'pool',
    'nursery',
    'mall',
    'station',
    'attic',
    'courtyard',
    'clinic',
    'basement',
  ];
  const rng = new SeededRng(`${Date.now()}-${Math.random()}`);
  // fix accidental space in ' orth'
  const adj = adjectives.map((a) => a.trim());
  return `${rng.pick(adj)}-${rng.pick(nouns)}-${rng.int(1, 99)}`;
}
