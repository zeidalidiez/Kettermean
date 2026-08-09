import { sanitizeDisplayText } from '../core/contentSafety';
import { SeededRng } from '../core/rng';
import type { MoodAxis, RoomCondition } from '../types';

export interface NpcDialogueContext {
  seed: string;
  label: string;
  tags: readonly string[];
  mood: MoodAxis;
  condition: RoomCondition;
}

const ADDRESSES = [
  'Visitor', 'Passenger', 'Resident', 'Applicant', 'Guest', 'Witness', 'Customer', 'Patient',
  'Delegate', 'Night worker', 'Returning party', 'Unlisted person', 'Current occupant', 'Future arrival',
  'Temporary member', 'Authorized dreamer', 'Last appointment', 'Next of memory',
] as const;

const LOCATIONS = [
  'the unnumbered counter', 'the west service window', 'the room behind reception',
  'the platform below this one', 'the final lit corridor', 'the closed information desk',
  'the second waiting area', 'the stairwell with no landing', 'the garden under the building',
  'the office beside yesterday', 'the elevator between floors', 'the blue maintenance door',
  'the silent baggage carousel', 'the empty observation booth', 'the nearest occupied mirror',
  'the annex across the weather', 'the records room after midnight', 'the courtyard inside the ceiling',
  'the terminal beyond the last announcement', 'the table reserved in your absence',
  'the window facing the interior', 'the flooded archive desk', 'the warmest corner of the basement',
  'the gate marked with your previous name',
] as const;

const DOCUMENTS = [
  'arrival card', 'sleep permit', 'return receipt', 'visitor badge', 'claim ticket', 'weather form',
  'memory inventory', 'temporary name', 'room key', 'appointment letter', 'transfer voucher',
  'incident copy', 'night schedule', 'lost-time report', 'continuity certificate', 'floor plan',
  'service number', 'blank photograph', 'departure notice', 'unclaimed signature',
] as const;

const OBJECTS = [
  'umbrella', 'shadow', 'chair', 'telephone', 'coat', 'luggage', 'reflection', 'room key',
  'ticket', 'left shoe', 'voice', 'assigned weather', 'spare face', 'name badge', 'small red light',
  'unopened letter', 'borrowed hour', 'empty cup', 'folded map', 'number in line',
] as const;

const STATES = [
  'filed under a different morning', 'waiting longer than the building', 'moved without authorization',
  'listed as present and missing', 'scheduled for the previous hour', 'returned before it was issued',
  'quietly reassigned to the basement', 'marked complete in blue pencil', 'held for further dreaming',
  'recorded twice with opposite answers', 'left beneath an occupied chair', 'approved by an empty office',
  'misplaced during the last announcement', 'sealed until the lights remember you',
  'counted among the permanent visitors', 'being inspected by someone behind the wall',
  'available only while you look away', 'registered to a room that has not opened',
] as const;

const INSTRUCTIONS = [
  'remain inside the painted line', 'keep both hands visible to the furniture',
  'do not answer the second announcement', 'take a number and forget where you found it',
  'wait until the carpet changes direction', 'return by the route that no longer exists',
  'leave the lights exactly as you found them', 'present yourself before your reflection arrives',
  'follow the humming sound, but not too closely', 'stand beneath the sign until it becomes accurate',
  'use the next room only once', 'keep your receipt somewhere the building can see it',
  'report any duplicate memories to reception', 'avoid the elevator when it knows your floor',
  'speak only after the ventilation stops', 'carry nothing that remembers the outdoors',
  'do not sit in a chair already facing you', 'wait for the weather to enter first',
  'cross the lobby before the music starts again', 'leave one ordinary object for the next visitor',
  'ignore any door that uses your voice', 'read the smallest notice before proceeding',
  'count the windows but never the reflections', 'keep moving when the room becomes familiar',
] as const;

const CONTRADICTIONS = [
  'nobody has opened that desk in years', 'the building insists you already collected it',
  'there has never been another floor', 'all departures were canceled tomorrow',
  'your photograph does not show you', 'the corridor was removed from every plan',
  'the room has no exterior wall', 'the clerk responsible has not yet been born',
  'the announcement denies making an announcement', 'every clock gives the same incorrect answer',
  'the rain is listed as an indoor employee', 'the key fits only while the lock is absent',
  'the receipt predates the service', 'someone crossed out the word outside',
  'the lights remember a different visitor', 'the map ends exactly where you are standing',
  'your number was called before you arrived', 'the furniture has already signed for it',
] as const;

const OBSERVATIONS = [
  'The ceiling is lower when nobody is speaking', 'The plants turn toward whichever room you left',
  'The floor dries from the center outward', 'The music pauses whenever a name is almost remembered',
  'The windows are practicing a different weather', 'The empty chairs have been changing shifts',
  'The elevator arrives more often than it leaves', 'The carpet pattern is slowly filing an appeal',
  'The lights have counted one visitor too many', 'The wall clock is waiting for a second hand',
  'The fountain repeats conversations from the archive', 'The hallway smells like a recently closed school',
  'The mirrors have agreed not to face one another', 'The exit signs are pointing at the same thought',
  'The distant room is much closer when unobserved', 'The building lowers its voice around animals',
  'The rain stops precisely at the information desk', 'The statues are wearing yesterday’s shadows',
  'The ventilation knows which room comes next', 'The furniture is arranged for a delayed explanation',
] as const;

const QUESTIONS = [
  'Did you bring the version of yourself listed on the form',
  'Which floor did the elevator claim you came from',
  'Have you noticed who keeps moving the horizon',
  'Were the lights already speaking when you entered',
  'Do you remember signing for this weather',
  'Is your shadow still using the same name',
  'Did reception explain why tomorrow is closed',
  'Can you hear the room waiting behind this one',
  'Have you been assigned a chair or only a direction',
  'Which announcement told you not to listen',
  'Did the garden follow you indoors',
  'Are you visiting, returning, or being remembered',
] as const;

const TAG_LINES: Readonly<Record<string, readonly string[]>> = {
  hotel: [
    'Checkout is complete, but your room continues',
    'Housekeeping found a second night inside your suitcase',
    'The vacancy sign has been asking for you by name',
  ],
  transit: [
    'Your connection departs from the platform beneath this sentence',
    'All routes are running normally in the opposite direction',
    'The last train left one passenger behind in every carriage',
  ],
  clinic: [
    'Your appointment is healthy enough to leave without you',
    'Please describe the symptom before the room develops it',
    'Observation will continue after there is nothing left to observe',
  ],
  garden: [
    'The roots have requested a larger waiting room',
    'These flowers bloom only during administrative delays',
    'Something beneath the lawn has learned the opening hours',
  ],
  archive: [
    'Your file contains a corridor we cannot locate',
    'The records are accurate until someone reads them',
    'Every blank page has been checked out under the same name',
  ],
  aquarium: [
    'The water is being stored elsewhere tonight',
    'Please do not alarm the fish pretending to be furniture',
    'The tide has an appointment at the service counter',
  ],
  industrial: [
    'The machinery is off, but its shift has not ended',
    'Maintenance has isolated the noise from whatever made it',
    'Every pressure gauge is measuring the room next door',
  ],
  chapel: [
    'The service began before the building was consecrated',
    'Please leave one silence in the collection plate',
    'The bells are ringing somewhere below their own sound',
  ],
  museum: [
    'The current exhibition is observing the visitors',
    'This object was donated by the room that contains it',
    'The gallery closes whenever the paintings agree',
  ],
  school: [
    'Attendance includes everyone who almost arrived',
    'The lesson continues in a classroom removed from the timetable',
    'Please submit your answer before hearing the question',
  ],
};

export const NPC_DIALOGUE_VOCABULARY = new Set(
  [
    ...ADDRESSES,
    ...LOCATIONS,
    ...DOCUMENTS,
    ...OBJECTS,
    ...STATES,
    ...INSTRUCTIONS,
    ...CONTRADICTIONS,
    ...OBSERVATIONS,
    ...QUESTIONS,
    ...Object.values(TAG_LINES).flat(),
  ].flatMap((value) => value.toLowerCase().match(/[a-z]+(?:['’][a-z]+)?/g) ?? []),
);

export function generateNpcDialogue(context: NpcDialogueContext): string {
  const rng = new SeededRng(`${context.seed}:npc-dialogue:${context.label}`);
  const address = rng.pick(ADDRESSES);
  const location = rng.pick(LOCATIONS);
  const document = rng.pick(DOCUMENTS);
  const object = rng.pick(OBJECTS);
  const state = rng.pick(STATES);
  const instruction = rng.pick(INSTRUCTIONS);
  const contradiction = rng.pick(CONTRADICTIONS);
  const observation = rng.pick(OBSERVATIONS);
  const question = rng.pick(QUESTIONS);
  const tagLines = context.tags.flatMap((tag) => TAG_LINES[tag.toLowerCase()] ?? []);
  const conditionClause = context.condition === 'normal'
    ? ''
    : ` The ${context.condition} condition is considered routine.`;
  const moodClause = context.mood === 'upper'
    ? ' The light is trying to be helpful.'
    : context.mood === 'downer'
      ? ' Do not let the quiet complete your sentence.'
      : context.mood === 'dynamic'
        ? ' It may move before you answer.'
        : ' Nothing will change while you are looking.';

  let line: string;
  switch (rng.int(0, 7)) {
    case 0: line = `${address}, your ${document} is ${state}; ${instruction}.`; break;
    case 1: line = `Your ${object} is waiting at ${location}, although ${contradiction}.`; break;
    case 2: line = `${observation}. ${instruction[0]!.toUpperCase()}${instruction.slice(1)}.`; break;
    case 3: line = `${question}? I was told ${contradiction}.`; break;
    case 4: line = `${address}, proceed to ${location} and ${instruction}; your ${document} is ${state}.`; break;
    case 5: line = tagLines.length
      ? `${rng.pick(tagLines)}. Your ${object} remains at ${location}.`
      : `${observation}. Your ${document} is ${state}.`;
      break;
    case 6: line = `I found your ${object} at ${location}. It was ${state}.`; break;
    default: line = `${question}? Your ${document} is ${state}.${moodClause}${conditionClause}`; break;
  }

  const sanitized = sanitizeDisplayText(line, 'Please wait where the room can see you.', 138);
  const completePhrase = sanitized.length === 138 && !/[.!?]$/.test(sanitized)
    ? sanitized.replace(/\s+\S*$/, '')
    : sanitized;
  return /[.!?]$/.test(completePhrase)
    ? completePhrase
    : `${completePhrase.replace(/[,;:–—-]+$/, '').trimEnd()}.`;
}
