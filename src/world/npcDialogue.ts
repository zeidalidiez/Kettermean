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
  'Night passenger', 'Archive claimant', 'Unscheduled witness', 'Provisional resident',
  'Indoor traveler', 'Registered sleeper', 'Replacement guest', 'Future employee',
  'Previous customer', 'Weather delegate', 'Unaccompanied reflection', 'Temporary ancestor',
  'Authorized duplicate', 'Late observer', 'Corridor applicant', 'Unfinished person',
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
  'the observatory below the laundry', 'the kiosk inside the fog', 'the third unmarked platform',
  'the nursery behind the projection booth', 'the ferry terminal without water',
  'the staircase reserved for weather', 'the greenhouse beyond the service tunnel',
  'the elevator shown only in mirrors', 'the booth beneath the false moon',
  'the counter where the carpet ends', 'the mezzanine from your oldest photograph',
  'the cinema between two announcements', 'the loading dock above the clouds',
  'the fountain underneath records', 'the staff room inside the aquarium',
  'the corridor labeled with tomorrow’s date', 'the chapel behind the vending machines',
  'the balcony facing a different building', 'the signal room after the final program',
  'the tunnel whose echo arrives first', 'the waiting room beside the artificial garden',
  'the luggage office beneath the tide', 'the desk occupied by your afterimage',
  'the smallest door in the monumental hall',
] as const;

const DOCUMENTS = [
  'arrival card', 'sleep permit', 'return receipt', 'visitor badge', 'claim ticket', 'weather form',
  'memory inventory', 'temporary name', 'room key', 'appointment letter', 'transfer voucher',
  'incident copy', 'night schedule', 'lost-time report', 'continuity certificate', 'floor plan',
  'service number', 'blank photograph', 'departure notice', 'unclaimed signature',
  'constellation permit', 'pollen declaration', 'tunnel license', 'audience receipt',
  'reflection warranty', 'indoor weather visa', 'shadow census', 'echo transcript',
  'temporary biography', 'duplicate birth notice', 'corridor manifest', 'moonlight invoice',
  'furniture passport', 'submerged timetable', 'dream inspection', 'voice return form',
  'horizon requisition', 'previous address card', 'silence authorization', 'afterimage claim',
] as const;

const OBJECTS = [
  'umbrella', 'shadow', 'chair', 'telephone', 'coat', 'luggage', 'reflection', 'room key',
  'ticket', 'left shoe', 'voice', 'assigned weather', 'spare face', 'name badge', 'small red light',
  'unopened letter', 'borrowed hour', 'empty cup', 'folded map', 'number in line',
  'pocket horizon', 'spare constellation', 'indoor cloud', 'maintenance echo',
  'unclaimed staircase', 'second childhood', 'folded doorway', 'artificial season',
  'recorded shadow', 'borrowed ceiling', 'emergency moon', 'sleeping telephone',
  'misprinted face', 'waterless ferry', 'audience member', 'sealed breeze',
  'tiny streetlight', 'previous reflection', 'glass animal', 'portable midnight',
] as const;

const STATES = [
  'filed under a different morning', 'waiting longer than the building', 'moved without authorization',
  'listed as present and missing', 'scheduled for the previous hour', 'returned before it was issued',
  'quietly reassigned to the basement', 'marked complete in blue pencil', 'held for further dreaming',
  'recorded twice with opposite answers', 'left beneath an occupied chair', 'approved by an empty office',
  'misplaced during the last announcement', 'sealed until the lights remember you',
  'counted among the permanent visitors', 'being inspected by someone behind the wall',
  'available only while you look away', 'registered to a room that has not opened',
  'catalogued beneath an extinct color', 'approved for use during false daylight',
  'still traveling through the ventilation', 'waiting inside a smaller copy of itself',
  'misdelivered to your next address', 'temporarily employed by the weather',
  'signed out to an impossible relative', 'displayed in the unattended gallery',
  'sleeping behind the emergency glass', 'recorded in a language the clocks understand',
  'under review by the household council', 'scheduled to become ordinary next week',
  'stored with the station’s private horizon', 'held beneath a tide that never arrives',
  'wearing an unauthorized reflection', 'assigned to the night shift indefinitely',
  'being translated into architectural plans', 'preserved at the wrong temperature',
  'awaiting a signature from the ceiling', 'listed among several temporary moons',
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
  'hold your breath while the corridor changes departments',
  'declare every shadow before the lights are counted',
  'leave the horizon folded until an attendant arrives',
  'take the elevator only when its reflection opens first',
  'return all moonlight to the observation desk',
  'keep your name away from the public address speakers',
  'walk backward past any room displaying your birthday',
  'wait beside the plant that has learned your schedule',
  'show the furniture that your hands are empty',
  'do not cross a shadow belonging to the ceiling',
  'repeat the announcement only in rooms without speakers',
  'keep the artificial weather inside its approved container',
  'leave one memory beneath the chair marked vacant',
  'follow the wet footprints until they become dust',
  'ask the smallest door whether it is currently open',
  'stand still when the building changes its mind',
  'return before the garden finishes moving indoors',
  'cover both ears when the silent alarm begins',
  'use the stairs numbered with unfamiliar years',
  'keep your reflection facing the nearest staffed counter',
  'carry the blank photograph where the moon can inspect it',
  'do not accept weather from an unattended machine',
  'wait for the carpet to finish spelling your destination',
  'exit through whichever wall remembers being a door',
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
  'the telescope has never faced outside', 'your shadow arrived with different identification',
  'the nursery was built after everyone grew old', 'the station broadcasts only to empty rooms',
  'the tide is registered on another floor', 'the plants have denied requesting sunlight',
  'every witness remembers a different ceiling', 'the tunnel has no entrance at either end',
  'the audience left before the building was performed', 'your file is older than the language inside it',
  'the weather refuses to cross painted lines', 'all photographs show the same vacant chair',
  'the elevator recognizes only future employees', 'the moon was removed during routine maintenance',
  'the corridor claims to be a piece of furniture', 'no authorized person has ever used that name',
  'the garden is classified as an indoor emergency', 'the broadcast began after the receiver was dismantled',
  'your reflection is already serving the night shift', 'the office exists only on evacuation diagrams',
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
  'The false moon dims whenever someone tells the truth',
  'The nursery toys have organized themselves by date of disappearance',
  'The service tunnel repeats footsteps before they happen',
  'The greenhouse is growing a floor plan instead of leaves',
  'The broadcast includes weather from rooms without ceilings',
  'The waterless ferry is still collecting damp tickets',
  'The observation dome rotates while every star remains fixed',
  'The vending machine accepts only discontinued names',
  'The luggage carousel delivers objects nobody packed',
  'The carpet has begun highlighting a route through solid walls',
  'The statues exchange expressions whenever the lights blink',
  'The fountain throws shadows instead of water',
  'The school bell rings according to a submerged timetable',
  'The archive shelves lean toward whichever file is being discussed',
  'The streetlights are illuminating a road removed years ago',
  'The hospital curtains conceal changes in architectural scale',
  'The platform signs count down toward an unlisted destination',
  'The laundry machines are washing several identical sunsets',
  'The chapel windows display the weather beneath the building',
  'The warehouse inventory includes each person currently inside',
  'The museum labels are slowly replacing object names with instructions',
  'The elevators have begun arriving in alphabetical order',
  'The indoor trees shed keys whenever reception closes',
  'The empty swimming pool reflects a crowded underwater room',
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
  'Did you authorize the moon to use your reflection',
  'Which version of the corridor accepted your application',
  'Have the plants explained where they found your schedule',
  'Can your shadow provide proof of its previous address',
  'Did you leave the horizon folded at reception',
  'Which announcement arrived before the speakers were installed',
  'Have you met the guest currently using your childhood',
  'Can you identify the room shown behind your photograph',
  'Did the ferry cross water or only remember doing so',
  'Which clock was responsible for approving this minute',
  'Have you returned the weather issued with your visitor badge',
  'Can the furniture confirm where you were seated tomorrow',
  'Did you notice when the ceiling changed departments',
  'Which elevator has been signing your name at night',
  'Have the mirrors finished counting everyone behind you',
  'Can you hear the garden growing through the ventilation',
  'Did your ticket mention the platform beneath this one',
  'Which door first addressed you in that voice',
  'Have you always cast the extra shadow on your left',
  'Can you remember whether this question happened outside',
] as const;

const OFFERS = [
  'I can exchange your shadow for one that knows the route',
  'We have a dry seat available inside the recorded thunder',
  'You may borrow a smaller name until reception recognizes you',
  'I can stamp the hour you lost while entering this room',
  'There is still one ordinary sunrise behind the service counter',
  'You may leave your reflection here while you inspect the corridor',
  'We can issue temporary weather if yours has stopped following you',
  'A quiet version of the announcement is available upon request',
  'I can reserve the staircase before it changes floors again',
  'There is a spare childhood folded inside the green cabinet',
  'You may trade this ticket for a window facing the present',
  'We can return your voice after the building finishes using it',
  'A maintenance moon is available for rooms without outdoor access',
  'I can redirect your appointment toward a less familiar yesterday',
  'You may collect one approved memory from the unattended desk',
  'We can provide a chair that has not already met you',
] as const;

const CONFIDENCES = [
  'I have checked the floor plan, and it is almost certainly lying',
  'Reception says the extra footsteps are part of ordinary service',
  'The building rarely repeats a mistake in exactly the same room',
  'Your paperwork is correct in every detail except the person',
  'Nothing behind that curtain has been authorized to know your name',
  'The weather should remain indoors for the rest of your visit',
  'This corridor was stable when the previous architecture used it',
  'The lights are only counting you for administrative purposes',
  'Your reflection has promised to return before the final announcement',
  'The elevator will eventually arrive at one of its listed floors',
  'All unfamiliar furniture has been inspected for recognizable memories',
  'The moon above reception is believed to be mostly decorative',
  'That door becomes safer each time it forgets where it leads',
  'Every sound below us has completed the required maintenance forms',
  'The plants have no official access to your previous address',
  'Management considers the second horizon a temporary visual condition',
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
    'The night machinery produces only warm numbered tickets',
    'One valve has been opening rooms instead of releasing pressure',
    'Your shift continues inside the sound after the motor stops',
    'Maintenance is waiting for the building to report itself',
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
  observatory: [
    'The telescope is pointed at the room we use during daylight',
    'Tonight’s moon has been recalled for routine inspection',
    'Every constellation except yours has completed its paperwork',
    'The dome opens only when the sky agrees to remain indoors',
  ],
  celestial: [
    'A spare sunrise is waiting in the lower observation drawer',
    'The stars are arranged according to an obsolete floor plan',
    'Your orbit was reassigned while you were standing still',
    'Please keep the eclipse between yourself and the nearest exit',
  ],
  broadcast: [
    'The test pattern has started recognizing members of the audience',
    'Your voice is delayed in a studio we cannot locate',
    'This program continues until the room receives itself',
    'Static reported your arrival before the camera was switched on',
  ],
  cinema: [
    'The feature is a recording of everyone waiting for it to begin',
    'Your seat appears in the film but not in this auditorium',
    'The subtitles have asked us to lower our voices',
    'Please remain until the credits identify the correct building',
  ],
  nursery: [
    'The toys remember a child with your current handwriting',
    'Nap time has been extended until the morning can be verified',
    'Someone tucked a smaller version of this room into the cradle',
    'The story ends differently whenever the smallest door opens',
  ],
  domestic: [
    'The kitchen table has reserved one place for the building',
    'Your hallway is being used by another family tonight',
    'The curtains are closed around a window that moved downstairs',
    'Household weather is available beside the unclaimed umbrellas',
  ],
  subterranean: [
    'The tunnel echo has arrived without its maintenance crew',
    'Pressure below the floor is spelling out an employee number',
    'Every buried cable leads to the same illuminated chair',
    'The foundation remembers a building heavier than this one',
  ],
  botanical: [
    'The seedlings were filed under names belonging to former visitors',
    'The greenhouse has requested permission to grow another ceiling',
    'Roots reached reception before the plant was delivered',
    'Every flower opens toward a different version of the sun',
  ],
  maritime: [
    'The ferry continues beneath us despite the absence of water',
    'Your tide permit lists an ocean located behind reception',
    'Navigation lights have begun marking a route through the furniture',
    'The harbor is keeping one wave after closing for identification',
  ],
};

export const NPC_DIALOGUE_TAG_LINES = TAG_LINES;

// Catalog and room tags use practical scene vocabulary, while dialogue can
// reach for a related literary register. Expand only close relationships so
// the newer pools are genuinely reachable without making every room sound the
// same (for example, `wet` can evoke maritime lines, but `hotel` cannot).
const TAG_RELATIONSHIPS: Readonly<Record<string, readonly string[]>> = {
  weather: ['observatory'],
  storm: ['observatory'],
  night: ['celestial'],
  eclipse: ['celestial'],
  tech: ['broadcast'],
  communication: ['broadcast'],
  cinema: ['broadcast'],
  home: ['domestic'],
  laundry: ['domestic'],
  station: ['subterranean'],
  transit: ['subterranean'],
  service: ['subterranean'],
  garden: ['botanical'],
  greenhouse: ['botanical'],
  aquarium: ['maritime'],
  wet: ['maritime'],
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
    ...OFFERS,
    ...CONFIDENCES,
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
  const dialogueTags = new Set(context.tags.map((tag) => tag.toLowerCase()));
  for (const tag of [...dialogueTags]) {
    for (const related of TAG_RELATIONSHIPS[tag] ?? []) dialogueTags.add(related);
  }
  const tagLines = [...dialogueTags].flatMap((tag) => TAG_LINES[tag] ?? []);
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
  const offer = rng.pick(OFFERS);
  const confidence = rng.pick(CONFIDENCES);
  switch (rng.int(0, 13)) {
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
    case 7: line = `${question}? Your ${document} is ${state}.${moodClause}${conditionClause}`; break;
    case 8: line = `${offer}. ${instruction[0]!.toUpperCase()}${instruction.slice(1)}.`; break;
    case 9: line = `${confidence}. Your ${object} remains ${state}.`; break;
    case 10: line = `${address}, ${instruction}; ${observation.toLowerCase()}.`; break;
    case 11: line = tagLines.length
      ? `${rng.pick(tagLines)}. ${confidence}.`
      : `${offer}. Your ${document} is ${state}.`;
      break;
    case 12: line = `I was told ${contradiction}. Even so, ${instruction}.`; break;
    default: line = `${observation}. ${question}?${conditionClause || moodClause}`; break;
  }

  const sanitized = sanitizeDisplayText(line, 'Please wait where the room can see you.', 138);
  const completePhrase = sanitized.length === 138 && !/[.!?]$/.test(sanitized)
    ? sanitized.replace(/\s+\S*$/, '')
    : sanitized;
  return /[.!?]$/.test(completePhrase)
    ? completePhrase
    : `${completePhrase.replace(/[,;:–—-]+$/, '').trimEnd()}.`;
}
