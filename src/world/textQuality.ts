import { sanitizeDisplayText } from '../core/contentSafety';
import { SeededRng } from '../core/rng';
import type {
  MoodAxis,
  RoomArchitecture,
  RoomCondition,
  RoomEnvironment,
  RoomSignText,
  RoomSpec,
} from '../types';

export const ROOM_BLURB_MIN_WORDS = 34;
export const ROOM_BLURB_MIN_SENTENCES = 2;
export const ROOM_BLURB_MAX_LENGTH = 640;
export const SIGN_CAPTION_MIN_WORDS = 8;
export const SIGN_CAPTION_MAX_LENGTH = 128;

export interface RoomTextContext {
  seed: string;
  title?: string;
  mood?: MoodAxis;
  tags?: readonly string[];
  themeTags?: readonly string[];
  condition?: RoomCondition;
  environment?: RoomEnvironment;
  architecture?: RoomArchitecture;
}

export const GENERIC_DETAILS = [
  'A low mechanical sound travels through the room, although none of the nearby fixtures appear to be running.',
  'Small signs of recent use remain everywhere, but every route toward another person arrives a moment too late.',
  'The nearest surfaces hold mismatched temperatures, as if several versions of the room are occupying the same address.',
  'Nothing here is completely abandoned; the furniture and lights continue performing their duties for an absent audience.',
  'Somewhere beyond sight, a public-address system prepares an announcement and repeatedly decides against making it.',
  'The arrangement feels temporary and carefully maintained, like a waiting area built for an appointment without a date.',
  'Every object seems correctly placed until it is viewed beside the next one, where the scale and purpose stop agreeing.',
  'An ordinary institutional smell lingers in the air, made unfamiliar by the complete absence of its expected source.',
  'Thin cables disappear into surfaces that have no visible machinery, each one trembling at a slightly different interval.',
  'A sequence of scuff marks crosses the floor, pauses neatly at an empty space, and resumes several meters farther on.',
  'The room contains too many clocks for a place with no posted hours, and none of them disagree in the same way.',
  'Distant glass reflects a warmer version of the architecture, furnished for an event the present room does not acknowledge.',
  'Labels have been applied to ordinary objects in careful handwriting, but every label describes something located elsewhere.',
  'A draft moves loose paper toward the center of the room, where it settles around an invisible piece of furniture.',
  'Muted colors gather around handles and switches, as if repeated use has worn away more than the surface finish.',
  'The largest object is positioned like a temporary obstacle, though the dust around it suggests decades of careful avoidance.',
  'A faint public melody reaches the room in fragments, each phrase arriving from a different wall before ending too early.',
  'Several fixtures have small personal modifications—tape, string, penciled numbers—left by occupants who never appear.',
  'The geometry becomes subtly more ornate toward the far end, where practical fittings acquire ceremonial details without explanation.',
  'Every route offers a plausible destination, yet their signs use the language of a building that expects no one to leave.',
  'A row of indicator lamps answers questions nobody has asked, advancing one position whenever the room falls completely quiet.',
  'Dust has gathered around several precise footprints while leaving the spaces inside those prints unnaturally clean.',
  'The public address speakers breathe between announcements, drawing the smallest hanging objects toward the ceiling.',
  'Every upholstered surface carries the shallow impression of someone who stood up only moments before the room was entered.',
  'A maintenance cart waits beside a spotless wall, stocked with tools intended for fixtures that do not exist nearby.',
  'Light reaches around the largest structures from contradictory directions, giving each one more than a single shadow.',
  'The air changes pressure at regular intervals, followed by the faint click of a lock located somewhere below the floor.',
  'Painted arrows become steadily more specific as they recede, eventually naming a destination too distant to read.',
  'A line of identical chairs differs only in temperature, alternating between recently occupied and cold enough to gather mist.',
  'Glass panels preserve handprints at several heights, including a careful sequence continuing across the ceiling.',
  'An electrical hum divides into a quiet chord near metal objects, as if each fixture is tuned to a separate room.',
  'Small numbered doors interrupt otherwise blank surfaces, all of them locked except the one placed beyond ordinary reach.',
  'The floor slopes too gently to see yet every loose object has collected along a curve through the middle of the space.',
  'A forgotten drink remains warm beside a ledger whose most recent entries describe the player’s present movements.',
  'Curtains hang where no windows are visible, stirring whenever the distant architecture changes scale.',
  'Each threshold carries a different indoor smell, though the view beyond every opening appears to show the same room.',
  'A cluster of service bells rings one at a time from left to right, then waits for an answer from beneath the furniture.',
  'Temporary barriers carefully protect an empty patch of floor marked with the dimensions of a missing object.',
  'The nearest clock has no hands, but its face grows brighter whenever another clock reaches an hour.',
  'Cable labels use dates instead of destinations, and every cable marked tomorrow has been freshly cut.',
  'The ceiling pattern repeats imperfectly around one dark panel, like a repaired memory copied from the wrong building.',
  'A trail of water crosses several dry materials without soaking them and disappears into the leg of an ordinary chair.',
  'Storage drawers stand open in a deliberate sequence, containing increasingly smaller versions of the room’s largest fixture.',
  'The emergency lighting gives every object a second outline offset by the width of a human hand.',
  'Faint conversation leaks from a ventilation grille, always ending just before either speaker says where they are.',
  'A fresh paper notice curls away from the wall above layers of older notices bearing exactly the same timestamp.',
  'Several mirrors have been turned around, their unfinished backs reflecting the room more accurately than their glass.',
  'The architecture makes space for a procession that never arrives, with railings polished by generations of waiting hands.',
  'An unattended machine dispenses numbered slips in silence, each bearing the same number in a different typeface.',
  'Cold air pools around one invisible shape and parts cleanly when footsteps pass close to its unseen edge.',
  'Decorative plants lean toward a blank directory as though it were the only source of daylight in the room.',
  'Every repeating column carries one minor repair, together spelling out a pattern visible only from the entrance.',
] as const;

const ENVIRONMENT_DETAILS: Record<RoomEnvironment, readonly string[]> = {
  interior: [
    'Ventilation moves the stale air from one sealed corner to another without changing its temperature.',
    'The walls absorb nearby footsteps, while a service corridor seems to continue behind them in both directions.',
    'Ceiling fixtures divide the floor into orderly zones that do not correspond to any visible entrance or exit.',
    'Closed doors carry strips of outdoor light around their frames, each suggesting a different hour and season.',
    'The carpet changes weave at invisible property lines, mapping rooms that no longer have dividing walls.',
    'Air returns through the vents with traces of rain, engine oil, and cut grass from places the building cannot contain.',
    'Emergency diagrams show the current room nested inside itself, with every smaller copy marked as the nearest exit.',
    'Acoustic tiles have been replaced in a spiral that tightens around a point directly above the player.',
    'Fluorescent fixtures illuminate one another more clearly than the furniture arranged beneath them.',
    'A corridor-width draft travels around the perimeter without passing through the center of the sealed room.',
    'Baseboards continue across several doorways as if those openings were added after the building stopped being solid.',
    'The temperature rises near every EXIT sign, despite none of them indicating an exterior route.',
  ],
  'open-hall': [
    'The broad ceiling makes every small movement visible, yet distance swallows its sound before it reaches the opposite side.',
    'Open floor stretches between isolated clusters of furniture, each arranged for a different event that never began.',
    'Far-off structural supports repeat with bureaucratic precision until they resemble scenery rather than architecture.',
    'Announcements reach the far wall before leaving the nearest speaker, returning with several words replaced.',
    'Pools of task lighting isolate miniature workplaces across the hall, each prepared for the same absent employee.',
    'The roof structure disappears into haze normally reserved for outdoor distances, though rain can be heard above it.',
    'Escalators rise from the empty floor and stop in midair beneath signs promising a lower level.',
    'Long reflections divide the polished surface into lanes whose markings do not exist on the floor itself.',
    'A distant information kiosk appears occupied until approached, when its chair turns out to face the wall.',
    'Structural bays count upward in both directions from a central column labeled zero.',
    'The empty volume carries the smell of many people leaving at once, carefully preserved without their warmth.',
    'A procession of ceiling lights switches on toward the horizon but never reaches the final fixture.',
  ],
  outdoor: [
    'The open air carries weather from somewhere nearby, but the plants and loose objects remain almost perfectly still.',
    'The horizon looks accessible from every path, although each route bends gently back toward the same occupied ground.',
    'Distant buildings hold their windows at identical brightness, ignoring the hour suggested by the sky above them.',
    'Cloud shadows cross the ground in geometric rooms, turning corners where no outdoor walls are visible.',
    'Wind moves through one species of plant at a time while every neighboring leaf remains held in place.',
    'The path is damp with recent rain, but the shallow footprints along it contain a powdery indoor dust.',
    'Bird calls arrive with the reverberation of a large terminal, followed by the chime of an unseen elevator.',
    'Distant hills repeat a nearby roofline exactly, including its antennae and one illuminated service window.',
    'Streetlights continue far into daylight, their pools of amber illumination visible against the bright ground.',
    'The sky changes color at straight boundaries aligned with the paths below, like rooms sharing one ceiling.',
    'A fence encloses the open landscape from the outside, its warning notices facing away from the player.',
    'Loose leaves collect beneath an invisible overhang whose dripping edge traces a perfect rectangle.',
  ],
};

const MOOD_DETAILS: Record<MoodAxis, readonly string[]> = {
  upper: [
    'The light is almost welcoming, which only makes the room’s patient emptiness feel more deliberate.',
    'Warm color gathers on the nearest objects while the far side remains preserved in an earlier, cooler hour.',
  ],
  downer: [
    'Every shadow appears to belong to a useful object, though several of those objects are no longer present.',
    'The room offers no immediate threat, only the exhausting certainty that it has been waiting much longer than you have.',
  ],
  static: [
    'Nothing visibly changes, but repeated details make it difficult to prove that time has remained still.',
    'The room holds its current arrangement with the concentration of someone trying not to be noticed.',
  ],
  dynamic: [
    'Light and reflection keep trading places across the floor, making stationary objects appear briefly undecided.',
    'A slow pulse passes through the space in separate pieces, never reaching every surface at the same moment.',
  ],
};

const CONDITION_DETAILS: Partial<Record<RoomCondition, readonly string[]>> = {
  bloodied: ['Dark stains interrupt the room’s official color scheme, old enough to have acquired their own dust.'],
  slimed: ['A translucent residue joins unrelated surfaces together and trembles whenever the building settles.'],
  scorched: ['Soot has preserved the outlines of missing objects more carefully than the surviving furniture.'],
  burning: ['Heat rearranges the distant view while small flames continue consuming material that never seems to diminish.'],
  ruined: ['Broken finishes expose earlier layers of the room, each one suggesting a different original purpose.'],
  overgrown: ['Leaves and roots follow the architecture’s old circulation routes as though they still understand the plan.'],
  frozen: ['Frost records every seam and fingerprint, including several impressions too high to have been made from the floor.'],
  flooded: ['Shallow water repeats the ceiling below, disturbed by ripples whose source always remains out of view.'],
  dusty: ['Fine dust softens the edges of everything except a narrow trail that ends before reaching any doorway.'],
  moldy: ['Pale growth maps the dampest surfaces in branching patterns that resemble an unfinished transit diagram.'],
  electrified: ['Static gathers around metal edges and releases in tiny flashes whenever the lights change their tone.'],
  haunted: ['Reflections occasionally retain a shape after its corresponding space has become empty afterward.'],
  gilded: ['Gold surfaces turn routine fixtures into ceremonial objects without clarifying what ceremony they serve.'],
  bioluminescent: ['Soft living light answers movement in delayed waves, as if the room must first decide what it saw.'],
  stormbound: ['Pressure moves through the structure before each distant impact, making signs and loose fittings answer in sequence.'],
};

export const CAPTION_COMPLETIONS = [
  'Keep this notice until the room approves your return',
  'Present this instruction at the nearest occupied service desk',
  'Current visitors must remain visible during all scheduled changes',
  'Service continues after the final announcement has been withdrawn',
  'Retain your assigned place while the building checks its records',
  'Report any missing time before proceeding beyond this marked area',
  'This information remains valid until your name appears differently',
  'Please follow the posted sequence even when the numbers repeat',
  'All questions will be answered during the previous operating hour',
  'Wait here until the next room confirms that you arrived',
  'Keep your assigned shadow inside the clearly marked waiting area',
  'The next announcement applies only to visitors from the previous hour',
  'Unclaimed weather will be transferred to the basement after closing',
  'Present all borrowed names before crossing the interior service corridor',
  'Duplicate reflections must be surrendered at the nearest information counter',
  'This route remains available until the building recognizes your arrival',
  'Do not exchange seats with anyone facing the opposite direction',
  'All misplaced hours are held for collection behind the reception desk',
  'Visitors without memories may request a temporary sequence from intake',
  'Management accepts no responsibility for suddenly familiar architecture',
  'Continue through the lobby without acknowledging the second version',
  'Your position will be preserved during any scheduled spatial changes',
  'Keep both copies until the original visitor has been positively identified',
  'Report unauthorized moonlight at the staffed observation window upstairs',
  'Return optical equipment facing the direction where it was discovered',
  'Your constellation must remain folded throughout all indoor portions',
  'The horizon is available by appointment during approved interior weather',
  'Unlisted stars are not authorized for navigation through public corridors',
  'Night service concludes when the ceiling produces a verified sunrise',
  'Observation records remain confidential from the objects being observed',
  'Declare every seed before entering rooms with artificial seasons',
  'Roots crossing the walkway require a current circulation permit',
  'Water furniture immediately if it displays evidence of new growth',
  'Indoor pollen becomes property of the ventilation department at closing',
  'Avoid flowers that repeat these instructions in a familiar voice',
  'Unregistered soil will be returned to its probable landscape of origin',
  'Leave the garden carrying the same number of shadows you brought',
  'Fruit discovered in administrative areas must be surrendered unopened',
  'Broadcasts remain delayed until the audience reaches the correct room',
  'Do not adjust the picture when it begins showing your arrival',
  'Static belongs to this station and cannot leave the premises',
  'Recorded applause continues until staff locate an appropriate event',
  'Subtitles may describe the neighboring room without additional notice',
  'Return borrowed voices before transmission displays the final test pattern',
  'Audience members appearing twice must occupy separate alternate rows',
  'Emergency programming begins after ordinary reality has formally concluded',
  'Depth restrictions remain active when the floor appears completely level',
  'Maintenance echoes must remain beside their original mechanical sound',
  'Never enter tunnels currently being remembered by another building',
  'Report pressure changes before they acquire an unauthorized personal name',
  'Every valve stays closed except the one omitted from all diagrams',
  'Utility staff may request verification of the current ceiling weight',
  'Keep loose minutes away from exposed cables and standing water',
  'Foundation listening continues quietly beneath every scheduled announcement',
  'Children require the adult shown in their oldest available photograph',
  'Nightlights remain active until every toy reports the same morning',
  'Issued blankets may contain weather from a previously occupied bedroom',
  'Return imaginary companions through the designated quiet service hatch',
  'The smallest door is reserved for visitors remembering being shorter',
  'Unclaimed lullabies replay during the posted administrative quiet hours',
  'Cradles must face away from corridors that have not been constructed',
  'Story time ends only after the room formally accepts the ending',
  'Passengers must confirm that water travels aboard the selected vessel',
  'Tide schedules follow the moon currently displayed inside reception',
  'Navigation remains compulsory after every recognizable coastline has disappeared',
  'Log any underground buoys immediately with the regional depth registry',
  'Passengers may collect one dry reflection from the ferry office',
  'Flood routes remain valid until their arrows begin pointing upstream',
  'Return all borrowed oceans before the public building closes tonight',
  'Show an indoor weather permit before boarding the submerged platform',
] as const;

/**
 * Keep authored prose, but complete clipped output and add deterministic local
 * detail whenever a small model (or the procedural base room) is too terse.
 */
export function ensureRoomBlurb(
  candidate: string | undefined,
  context: RoomTextContext,
  fallback?: string,
): string {
  const parts: string[] = [];
  const primary = normalizeProse(candidate ?? '');
  if (primary) parts.push(primary);

  const secondary = normalizeProse(fallback ?? '');
  if (secondary && !isNearDuplicate(secondary, parts)) parts.push(secondary);

  const rng = new SeededRng(`${context.seed}:room-text-quality`);
  const details = [
    ...(context.condition ? CONDITION_DETAILS[context.condition] ?? [] : []),
    ...(context.environment ? ENVIRONMENT_DETAILS[context.environment] : []),
    ...(context.mood ? MOOD_DETAILS[context.mood] : []),
    ...GENERIC_DETAILS,
  ];
  const unused = [...new Set(details)];

  while (!meetsBlurbFloor(parts.join(' ')) && unused.length > 0) {
    const index = rng.int(0, unused.length - 1);
    const [detail] = unused.splice(index, 1);
    if (detail && !isNearDuplicate(detail, parts)) parts.push(detail);
  }

  const combined = parts.join(' ').trim() || GENERIC_DETAILS[0];
  return truncateCompleteProse(combined, ROOM_BLURB_MAX_LENGTH);
}

/** Preserve useful model copy while expanding captions such as "AGENDA". */
export function ensureSignCaption(
  candidate: string | undefined,
  identity: string,
): string {
  const cleaned = sanitizeDisplayText(candidate ?? '', '', SIGN_CAPTION_MAX_LENGTH * 2)
    .replace(/^[-*`"']+|[-*`"']+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (wordCount(cleaned) >= SIGN_CAPTION_MIN_WORDS) {
    return truncateAtWord(cleaned, SIGN_CAPTION_MAX_LENGTH);
  }

  const rng = new SeededRng(`${identity}:${cleaned}:sign-caption-quality`);
  const completion = rng.pick(CAPTION_COMPLETIONS);
  const modelFragment = truncateAtWord(cleaned, 48);
  const completed = truncateAtWord(
    modelFragment ? `${modelFragment} · ${completion}` : completion,
    SIGN_CAPTION_MAX_LENGTH,
  );
  return wordCount(completed) >= SIGN_CAPTION_MIN_WORDS ? completed : completion;
}

/** Final runtime guard also upgrades rooms restored from an older in-memory cache. */
export function enforceRoomTextQuality<T extends RoomSpec>(room: T): T {
  room.blurb = ensureRoomBlurb(room.blurb, room);
  if (room.signs?.length) {
    room.signs = room.signs.map((sign, index): RoomSignText => ({
      ...sign,
      caption: ensureSignCaption(sign.caption, `${room.seed}:${index}:${sign.headline}`),
    }));
  }
  return room;
}

export function wordCount(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export function sentenceCount(value: string): number {
  return value.match(/[.!?…]+(?=\s|$)/g)?.length ?? 0;
}

function meetsBlurbFloor(value: string): boolean {
  return wordCount(value) >= ROOM_BLURB_MIN_WORDS &&
    sentenceCount(value) >= ROOM_BLURB_MIN_SENTENCES;
}

function normalizeProse(value: string): string {
  let cleaned = sanitizeDisplayText(value, '', ROOM_BLURB_MAX_LENGTH * 3)
    .replace(/^[-*`"']+|[-*`"']+$/g, '')
    // Small instruction models often number prose despite being asked not to.
    .replace(/(^|[.!?]\s*|\s)\d+[.)]\s*(?=[A-Z])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';

  if (/\b(?:a|an|and|at|by|for|from|in|into|its|of|on|or|our|the|their|through|to|toward|under|with|your)\s*[,;:–—-]*$/i.test(cleaned)) {
    const lastComplete = Math.max(
      cleaned.lastIndexOf('.'),
      cleaned.lastIndexOf('!'),
      cleaned.lastIndexOf('?'),
      cleaned.lastIndexOf('…'),
    );
    cleaned = lastComplete >= 0 && wordCount(cleaned.slice(0, lastComplete + 1)) >= 6
      ? cleaned.slice(0, lastComplete + 1).trim()
      : '';
  }
  if (!cleaned) return '';
  return /[.!?…]["')\]]?$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

function truncateCompleteProse(value: string, maximum: number): string {
  if (value.length <= maximum) return value;
  const slice = value.slice(0, maximum + 1);
  const lastComplete = Math.max(
    slice.lastIndexOf('.'),
    slice.lastIndexOf('!'),
    slice.lastIndexOf('?'),
    slice.lastIndexOf('…'),
  );
  if (lastComplete >= Math.floor(maximum * 0.55)) {
    return slice.slice(0, lastComplete + 1).trim();
  }
  const wordSafe = truncateAtWord(slice, maximum).replace(/[,:;–—-]+$/, '').trim();
  return /[.!?…]$/.test(wordSafe) ? wordSafe : `${wordSafe}.`;
}

function truncateAtWord(value: string, maximum: number): string {
  if (value.length <= maximum) return value;
  const slice = value.slice(0, maximum + 1);
  const boundary = slice.lastIndexOf(' ');
  return slice.slice(0, boundary > maximum * 0.55 ? boundary : maximum).trim();
}

function isNearDuplicate(candidate: string, existing: readonly string[]): boolean {
  const normalized = normalizeWords(candidate);
  return existing.some((value) => {
    const other = normalizeWords(value);
    return other.includes(normalized) || normalized.includes(other);
  });
}

function normalizeWords(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
