import { SeededRng } from '../core/rng';
import type {
  MoodAxis,
  RoomArchitecture,
  RoomCondition,
  RoomEnvironment,
  RoomScaleProfile,
} from '../types';

export type SignWordRole =
  | 'modifier'
  | 'place'
  | 'institution'
  | 'instruction'
  | 'service'
  | 'time';

export interface TaggedSignWord {
  text: string;
  role: SignWordRole;
  tags: string[];
}

export interface ProceduralSignText {
  headline: string;
  caption: string;
  /** Tags inherited from the selected words, useful for tests and later steering. */
  tags: string[];
}

export interface SignageContext {
  seed: string;
  tags: readonly string[];
  mood: MoodAxis;
  condition: RoomCondition;
  environment: RoomEnvironment;
  architecture: RoomArchitecture;
  scaleProfile: RoomScaleProfile;
}

const wordGroup = (
  role: SignWordRole,
  tags: readonly string[],
  words: readonly string[],
): TaggedSignWord[] => words.map((text) => ({ text, role, tags: [...tags] }));

/**
 * A deliberately data-only vocabulary. Geometry and typography live in
 * RoomBuilder, while this module owns meaning and correlation. A word can
 * participate in many different signs without requiring another 3D asset.
 */
export const SIGN_WORDS: TaggedSignWord[] = [
  ...wordGroup('place', ['environment', 'place', 'warm', 'tropical', 'nature'], [
    'Jungle', 'Rainforest', 'Canopy', 'Lagoon', 'Mangrove', 'Palmhouse', 'Reef', 'Oasis',
  ]),
  ...wordGroup('place', ['environment', 'place', 'cold', 'frozen', 'nature'], [
    'Glacier', 'Tundra', 'Icefield', 'Snowline', 'Frost Garden', 'White Lake', 'Cold Coast', 'Winter Basin',
  ]),
  ...wordGroup('place', ['environment', 'place', 'outdoor', 'field', 'nature'], [
    'Meadow', 'Orchard', 'Field', 'Marsh', 'Garden', 'Forest', 'Valley', 'Horizon',
  ]),
  ...wordGroup('place', ['environment', 'place', 'wet', 'water', 'pool'], [
    'Aquarium', 'Bathhouse', 'Reservoir', 'Deep Pool', 'Canal', 'Water Court', 'Floodway', 'Blue Grotto',
  ]),
  ...wordGroup('place', ['place', 'urban', 'plaza', 'civic'], [
    'Plaza', 'Arcade', 'Square', 'Promenade', 'Civic Court', 'Market', 'Town Hall', 'Public Walk',
  ]),
  ...wordGroup('place', ['place', 'transit', 'station', 'terminal'], [
    'Terminal', 'Concourse', 'Platform', 'Station', 'Underpass', 'Arrivals', 'Departure Hall', 'Transfer',
  ]),
  ...wordGroup('place', ['place', 'airport', 'terminal', 'vast'], [
    'Hangar', 'Runway', 'Gatehouse', 'Airfield', 'Control Tower', 'Baggage Hall', 'Skybridge', 'Flight Court',
  ]),
  ...wordGroup('place', ['place', 'office', 'civic', 'interior'], [
    'Office', 'Annex', 'Records', 'Reception', 'Mailroom', 'Boardroom', 'Registry', 'Administration',
  ]),
  ...wordGroup('place', ['place', 'clinic', 'hospital', 'observation'], [
    'Clinic', 'Ward', 'Observation', 'Recovery', 'Intake', 'Imaging', 'Waiting Room', 'Night Pharmacy',
  ]),
  ...wordGroup('place', ['place', 'school', 'classroom', 'archive'], [
    'School', 'Library', 'Archive', 'Lecture Hall', 'Gymnasium', 'Laboratory', 'Reading Room', 'Faculty Wing',
  ]),
  ...wordGroup('place', ['place', 'motel', 'hotel', 'home'], [
    'Motel', 'Hotel', 'Guest Wing', 'Lounge', 'Ballroom', 'Suite', 'Laundry', 'Breakfast Room',
  ]),
  ...wordGroup('place', ['place', 'mall', 'retail', 'food'], [
    'Food Court', 'Supermarket', 'Showroom', 'Cinema', 'Toy Store', 'Restaurant', 'Outlet', 'Service Counter',
  ]),
  ...wordGroup('place', ['place', 'industrial', 'warehouse', 'service'], [
    'Warehouse', 'Boiler Room', 'Loading Bay', 'Substation', 'Workshop', 'Utility Hall', 'Plant', 'Freight Yard',
  ]),
  ...wordGroup('place', ['place', 'parking', 'highway', 'roadside'], [
    'Parking', 'Rest Stop', 'Motor Court', 'Garage', 'Toll Plaza', 'Service Road', 'Level B', 'Lay-by',
  ]),
  ...wordGroup('place', ['place', 'chapel', 'cathedral', 'ceremonial'], [
    'Chapel', 'Sanctuary', 'Cathedral', 'Choir', 'Vestry', 'Shrine', 'Assembly Hall', 'Quiet Room',
  ]),
  ...wordGroup('place', ['place', 'museum', 'exhibition', 'atrium'], [
    'Museum', 'Gallery', 'Atrium', 'Exhibition', 'Sculpture Court', 'Collection', 'West Wing', 'Rotunda',
  ]),
  ...wordGroup('place', ['place', 'night', 'outdoor', 'uncanny'], [
    'Night District', 'Moon Court', 'Last Street', 'Empty Quarter', 'After Hours', 'North End', 'Back Lot', 'Far Side',
  ]),
  ...wordGroup('place', ['place', 'ruined', 'abandoned', 'downer'], [
    'Ruins', 'Dead Mall', 'Old Works', 'Lost Block', 'Collapsed Wing', 'Vacant City', 'Ash Yard', 'Closed District',
  ]),

  ...wordGroup('modifier', ['warm', 'tropical', 'dynamic'], [
    'Tropical', 'Sunlit', 'Humid', 'Golden', 'Fever', 'Summer', 'Palm', 'Equatorial',
  ]),
  ...wordGroup('modifier', ['cold', 'frozen', 'static'], [
    'Frozen', 'Winter', 'Pale', 'Glacial', 'White', 'Subzero', 'Silent', 'Northern',
  ]),
  ...wordGroup('modifier', ['wet', 'water', 'slimed'], [
    'Flooded', 'Dripping', 'Submerged', 'Blue', 'Tidal', 'Drowned', 'Slick', 'Deep',
  ]),
  ...wordGroup('modifier', ['fire', 'burning', 'scorched', 'warm'], [
    'Burning', 'Ashen', 'Red', 'Smoldering', 'Emergency', 'Cinder', 'Heat', 'Charred',
  ]),
  ...wordGroup('modifier', ['ruined', 'abandoned', 'downer'], [
    'Abandoned', 'Broken', 'Condemned', 'Former', 'Forgotten', 'Vacant', 'Closed', 'Last',
  ]),
  ...wordGroup('modifier', ['overgrown', 'nature', 'upper'], [
    'Overgrown', 'Green', 'Living', 'Moss', 'Wild', 'Botanical', 'Root', 'Blooming',
  ]),
  ...wordGroup('modifier', ['bloodied', 'gore', 'downer'], [
    'Crimson', 'Red', 'Surgical', 'Restricted', 'Sealed', 'Stained', 'Vital', 'Quiet',
  ]),
  ...wordGroup('modifier', ['neon', 'dynamic', 'mall', 'night'], [
    'Electric', 'Neon', 'Ultraviolet', 'Laser', 'Chrome', 'Radiant', 'Video', 'Future',
  ]),
  ...wordGroup('modifier', ['static', 'liminal', 'interior'], [
    'Municipal', 'Public', 'Standard', 'Central', 'Regional', 'Civic', 'Permanent', 'Official',
  ]),
  ...wordGroup('modifier', ['uncanny', 'dream', 'dynamic'], [
    'Impossible', 'Soft', 'Dream', 'Wrong', 'Second', 'Endless', 'Reverse', 'Invisible',
  ]),
  ...wordGroup('modifier', ['dusty', 'desert', 'old'], [
    'Dust', 'Desert', 'Sepia', 'Dry', 'Ancient', 'Powder', 'Sunbleached', 'Forgotten',
  ]),
  ...wordGroup('modifier', ['storm', 'outdoor', 'dynamic'], [
    'Storm', 'Wind', 'Thunder', 'Rain', 'Black Sky', 'Tempest', 'Weather', 'Gale',
  ]),

  ...wordGroup('institution', ['civic', 'office', 'public'], [
    'Authority', 'Department', 'Bureau', 'Commission', 'Council', 'Office', 'Administration', 'Registry',
  ]),
  ...wordGroup('institution', ['transit', 'station', 'terminal'], [
    'Transit', 'Rail', 'Travel', 'Passenger Services', 'Route Control', 'Connections', 'Transport', 'Interchange',
  ]),
  ...wordGroup('institution', ['retail', 'mall', 'food'], [
    'Company', 'Market', 'Foods', 'Trading', 'Refreshments', 'Stores', 'Supply', 'Customer Service',
  ]),
  ...wordGroup('institution', ['clinic', 'hospital', 'lab'], [
    'Health', 'Research', 'Care', 'Diagnostics', 'Medical Center', 'Wellness', 'Laboratory', 'Human Services',
  ]),
  ...wordGroup('institution', ['school', 'archive', 'museum'], [
    'Institute', 'Academy', 'University', 'Archives', 'Learning Center', 'Foundation', 'Collection', 'Conservatory',
  ]),
  ...wordGroup('institution', ['industrial', 'service', 'warehouse'], [
    'Works', 'Industries', 'Maintenance', 'Operations', 'Engineering', 'Utilities', 'Storage', 'Processing',
  ]),
  ...wordGroup('institution', ['nature', 'outdoor', 'tropical'], [
    'Gardens', 'Wildlife Service', 'Forest Office', 'Climate Center', 'Park Authority', 'Field Station', 'Water Board', 'Reserve',
  ]),
  ...wordGroup('institution', ['dream', 'uncanny', 'liminal'], [
    'Dream Office', 'Memory Service', 'Sleep Authority', 'Continuity', 'Department of Return', 'Night Bureau', 'Elsewhere', 'Threshold Control',
  ]),

  ...wordGroup('instruction', ['direction', 'transit', 'public'], [
    'Proceed To', 'This Way To', 'Continue To', 'Transfer At', 'Follow Signs For', 'Return Via', 'Next Stop', 'Now Entering',
  ]),
  ...wordGroup('instruction', ['warning', 'downer', 'restricted'], [
    'Do Not Enter', 'Keep Out', 'No Return', 'Restricted', 'Authorized Only', 'Remain Inside', 'Do Not Follow', 'Turn Back',
  ]),
  ...wordGroup('instruction', ['upper', 'public', 'service'], [
    'Welcome To', 'Please Visit', 'Now Open', 'You Are Here', 'Enjoy', 'Information For', 'Entrance To', 'Guests This Way',
  ]),
  ...wordGroup('instruction', ['dynamic', 'emergency', 'fire'], [
    'Evacuate To', 'Emergency Route', 'Move Quickly To', 'Alarm Zone', 'Fire Assembly At', 'Await Instructions', 'Keep Moving', 'Use Other Route',
  ]),

  ...wordGroup('service', ['public', 'civic', 'service'], [
    'Information', 'Check-in', 'Tickets', 'Reception', 'Customer Care', 'Lost Property', 'Public Access', 'Help Desk',
  ]),
  ...wordGroup('service', ['food', 'retail', 'mall'], [
    'Breakfast', 'Dining', 'Snacks', 'Cold Drinks', 'Fresh Produce', 'Open Late', 'Room Service', 'Daily Specials',
  ]),
  ...wordGroup('service', ['industrial', 'service', 'restricted'], [
    'Loading', 'Deliveries', 'Maintenance', 'Staff Only', 'Freight', 'Machine Access', 'Utility Control', 'Inspection',
  ]),
  ...wordGroup('service', ['dream', 'uncanny', 'liminal'], [
    'Memory Exchange', 'Dream Intake', 'Name Collection', 'Sleep Processing', 'Return Desk', 'Lost Time', 'Continuity Check', 'Wake Service',
  ]),

  ...wordGroup('time', ['night', 'static'], [
    'After Midnight', 'Night Shift', '03:17', 'Last Service', 'Until Dawn', 'Always Open', 'Closing Time', 'Late Hours',
  ]),
  ...wordGroup('time', ['dream', 'uncanny'], [
    'Yesterday Only', 'Opening Soon', 'Never Closed', 'Before You Arrived', 'Again Tomorrow', 'No Current Time', 'Since 1987', 'Forever Temporary',
  ]),
  ...wordGroup('time', ['public', 'service'], [
    'Level 01', 'Level B2', 'Gate 00', 'Route 7', 'Zone C', 'Floor 13', 'Counter 4', 'Platform 9',
  ]),
];

const TAG_RELATIONS: Record<string, readonly string[]> = {
  motel: ['hotel', 'home', 'night'],
  hotel: ['motel', 'lobby', 'service'],
  jungle: ['tropical', 'warm', 'nature'],
  garden: ['nature', 'overgrown', 'upper'],
  greenhouse: ['garden', 'nature', 'lab'],
  fire: ['burning', 'scorched', 'warm', 'emergency'],
  burning: ['fire', 'scorched', 'warm', 'emergency'],
  frozen: ['cold', 'water', 'static'],
  pool: ['water', 'wet', 'outdoor'],
  aquarium: ['water', 'wet', 'museum'],
  office: ['civic', 'public', 'interior'],
  clinic: ['hospital', 'observation', 'public'],
  terminal: ['transit', 'station', 'airport'],
  airport: ['terminal', 'transit', 'vast'],
  parking: ['highway', 'roadside', 'service'],
  mall: ['retail', 'food', 'public'],
  warehouse: ['industrial', 'service', 'loading'],
  ruined: ['abandoned', 'downer', 'old'],
  overgrown: ['nature', 'garden', 'upper'],
  slimed: ['wet', 'water', 'dynamic'],
  outdoor: ['environment', 'nature'],
  interior: ['environment', 'place'],
};

export function generateRoomSigns(context: SignageContext): ProceduralSignText[] {
  const rng = new SeededRng(`${context.seed}:tagged-signage`);
  const contextTags = expandTags([
    ...context.tags,
    context.mood,
    context.condition,
    context.environment,
    context.architecture,
  ]);
  const countRange: Record<RoomScaleProfile, readonly [number, number]> = {
    closet: [1, 1],
    human: [1, 2],
    grand: [2, 4],
    monumental: [3, 5],
    colossal: [4, 6],
  };
  const [minimum, maximum] = countRange[context.scaleProfile];
  const count = rng.int(minimum, maximum);
  const usedHeadlines = new Set<string>();
  const signs: ProceduralSignText[] = [];

  for (let index = 0; index < count; index += 1) {
    let sign: ProceduralSignText | null = null;
    for (let attempt = 0; attempt < 8 && !sign; attempt += 1) {
      const template = rng.int(0, 6);
      const selected: TaggedSignWord[] = [];
      const take = (role: SignWordRole): TaggedSignWord => {
        const word = weightedWord(rng, role, contextTags, selected);
        selected.push(word);
        return word;
      };
      const modifier = (): string => take('modifier').text;
      const place = (): string => take('place').text;
      const institution = (): string => take('institution').text;
      const instruction = (): string => take('instruction').text;
      const service = (): string => take('service').text;

      const headline = (() => {
        switch (template) {
          case 0: return `${modifier()} ${place()}`;
          case 1: return `${place()} ${institution()}`;
          case 2: return `${instruction()} ${place()}`;
          case 3: return `${modifier()} ${institution()}`;
          case 4: return `${place()} · ${service()}`;
          case 5: return `${institution()} of ${place()}`;
          default: return `${instruction()} ${modifier()} ${place()}`;
        }
      })().replace(/\s+/g, ' ').trim();
      if (usedHeadlines.has(headline)) continue;
      const captionWord = weightedWord(rng, rng.chance(0.55) ? 'time' : 'service', contextTags, selected);
      selected.push(captionWord);
      sign = {
        headline,
        caption: captionWord.text,
        tags: [...new Set(selected.flatMap((word) => word.tags))],
      };
    }
    if (!sign) continue;
    usedHeadlines.add(sign.headline);
    signs.push(sign);
  }

  return signs;
}

function weightedWord(
  rng: SeededRng,
  role: SignWordRole,
  contextTags: ReadonlySet<string>,
  selected: readonly TaggedSignWord[],
): TaggedSignWord {
  const candidates = SIGN_WORDS.filter((word) => word.role === role);
  const selectedTags = new Set(selected.flatMap((word) => word.tags));
  const weighted = candidates.map((word) => {
    const roomMatches = word.tags.filter((tag) => contextTags.has(tag)).length;
    const chainMatches = word.tags.filter((tag) => selectedTags.has(tag)).length;
    const duplicatePenalty = selected.some((entry) => entry.text === word.text) ? 0.08 : 1;
    return {
      word,
      weight: (1 + roomMatches * 5.5 + chainMatches * 2.6) * duplicatePenalty,
    };
  });
  let roll = rng.float(0, weighted.reduce((sum, entry) => sum + entry.weight, 0));
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.word;
  }
  return weighted.at(-1)!.word;
}

function expandTags(tags: readonly string[]): Set<string> {
  const expanded = new Set(tags.map((tag) => tag.toLowerCase()));
  for (const tag of [...expanded]) {
    for (const related of TAG_RELATIONS[tag] ?? []) expanded.add(related);
  }
  return expanded;
}
