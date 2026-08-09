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

/** Fourth expansion: 180 additional, semantically tagged billboard fragments. */
export const SIGN_WORDS_ROUND_FOUR: TaggedSignWord[] = [
  ...wordGroup('place', ['place', 'observatory', 'celestial', 'night'], [
    'Meridian Gallery', 'Lunar Annex', 'Comet Hall', 'Planetarium Steps', 'Solar Archive',
    'Transit Dome', 'Star Chamber', 'Eclipse Balcony', 'Meteor Court', 'Sidereal Lobby',
  ]),
  ...wordGroup('place', ['place', 'subterranean', 'industrial', 'service'], [
    'Pump Cavern', 'Cable Vault', 'Lower Sump', 'Ventilation Drift', 'Generator Grotto',
    'Pressure Tunnel', 'Maintenance Well', 'Drainage Hall', 'Bedrock Office', 'Utility Descent',
  ]),
  ...wordGroup('place', ['place', 'nursery', 'domestic', 'uncanny'], [
    'Nap Room', 'Toy Census', 'Cradle Office', 'Quiet Playhouse', 'Lost Bedroom',
    'Story Corner', 'Night Nursery', 'Blanket Exchange', 'Small Door Hall', 'Indoor Sandbox',
  ]),

  ...wordGroup('modifier', ['optical', 'celestial', 'projection', 'dynamic'], [
    'Prismatic', 'Lenticular', 'Afterimage', 'Orbital', 'Parallax',
    'Spectral', 'Mirrored', 'Astral', 'Refracted', 'Peripheral',
  ]),
  ...wordGroup('modifier', ['botanical', 'weather', 'nature', 'overgrown'], [
    'Pollen', 'Monsoon', 'Rootbound', 'Cloudgrown', 'Hothouse',
    'Seeded', 'Rainwashed', 'Spore', 'Windpruned', 'Verdant',
  ]),
  ...wordGroup('modifier', ['archive', 'dream', 'uncanny', 'static'], [
    'Misfiled', 'Carbon Copy', 'Provisional', 'Unremembered', 'Duplicate',
    'Postdated', 'Unclaimed', 'Redacted', 'Recursive', 'Retrospective',
  ]),

  ...wordGroup('institution', ['broadcast', 'cinema', 'public', 'projection'], [
    'Signal Ministry', 'Transmission Office', 'Public Frequency', 'Picture Authority', 'Relay Bureau',
    'Continuity Studio', 'Audience Services', 'Emergency Broadcast', 'Test Pattern Council', 'Night Programming',
  ]),
  ...wordGroup('institution', ['maritime', 'water', 'transit', 'service'], [
    'Harbor Authority', 'Tide Commission', 'Ferry Office', 'Depth Registry', 'Buoy Service',
    'Canal Ministry', 'Navigation Board', 'Flood Control', 'Dredging Council', 'Mariner Intake',
  ]),
  ...wordGroup('institution', ['domestic', 'ceremonial', 'home', 'uncanny'], [
    'Household Council', 'Table Committee', 'Curtain Authority', 'Domestic Weather', 'Lamp Registry',
    'Guest Department', 'Carpet Office', 'Family Archive', 'Kitchen Tribunal', 'Hallway Ministry',
  ]),

  ...wordGroup('instruction', ['optical', 'observatory', 'celestial', 'warning'], [
    'Face the False Moon', 'Observe With One Eye', 'Keep Stars Numbered', 'Follow the Afterimage', 'Report Moving Constellations',
    'Stand Outside the Shadow', 'Adjust to Interior Night', 'Do Not Focus Twice', 'Return the Borrowed Horizon', 'Wait for Correct Alignment',
  ]),
  ...wordGroup('instruction', ['botanical', 'lab', 'nature', 'service'], [
    'Declare All Pollen', 'Water Only Recorded Plants', 'Keep Roots Below Reception', 'Present a Viable Cutting', 'Do Not Wake the Ferns',
    'Follow the Green Cable', 'Return Soil After Use', 'Count Leaves Before Entry', 'Quarantine Familiar Blossoms', 'Wait Until Germination',
  ]),
  ...wordGroup('instruction', ['civic', 'time', 'public', 'uncanny'], [
    'Arrive During Yesterday', 'Queue in Birth Order', 'Use Your Future Signature', 'Remain Until Previously Called', 'Correct the Nearest Clock',
    'Apply Before Existing', 'Renew Your Current Minute', 'Present Proof of Tomorrow', 'Keep the Earlier Appointment', 'Exit in Numerical Order',
  ]),

  ...wordGroup('service', ['broadcast', 'cinema', 'projection', 'public'], [
    'Static Removal', 'Audience Replacement', 'Lost Signal Claims', 'Subtitle Repair', 'Emergency Applause',
    'Test Pattern Rental', 'Voice Synchronization', 'Channel Reassignment', 'Picture Delay', 'Transmission Memories',
  ]),
  ...wordGroup('service', ['subterranean', 'industrial', 'maintenance', 'restricted'], [
    'Pressure Accounting', 'Echo Inspection', 'Cable Reburial', 'Sump Reservations', 'Tunnel Weather',
    'Valve Confession', 'Bedrock Claims', 'Emergency Ventilation', 'Foundation Listening', 'Unauthorized Depths',
  ]),
  ...wordGroup('service', ['domestic', 'dream', 'home', 'uncanny'], [
    'Second Breakfast', 'Blanket Licensing', 'Spare Parent Desk', 'Dream Laundry', 'Cupboard Admissions',
    'Quiet Toy Repair', 'Borrowed Bed Service', 'Nightlight Exchange', 'Family Resemblance', 'Indoor Childhood',
  ]),

  ...wordGroup('time', ['celestial', 'observatory', 'night', 'static'], [
    'At the Next Eclipse', 'Before Moonrise Repeats', 'During False Dawn', 'Until the Comet Stops', 'At Sidereal Closing',
    'Between Two Midnights', 'After the Stars Clock Out', 'When the Dome Opens', 'One Orbit From Now', 'Before Daylight Is Filed',
  ]),
  ...wordGroup('time', ['weather', 'nature', 'dynamic', 'outdoor'], [
    'Until the Rain Returns', 'During the Indoor Storm', 'After the Last Thunder', 'Before Fog Check-In', 'When Pollen Clears',
    'At High Interior Tide', 'Until Wind Changes Rooms', 'After the Cloud Inventory', 'During Scheduled Lightning', 'Before the Snow Remembers',
  ]),
  ...wordGroup('time', ['civic', 'archive', 'uncanny', 'service'], [
    'While Records Disagree', 'Until Your Number Ages', 'After Retroactive Opening', 'Before the Clerk Arrives', 'During Previous Business Hours',
    'When the Queue Reverses', 'Until Further Yesterdays', 'After Your File Wakes', 'Before the Office Forgets', 'At the Earlier Closing Time',
  ]),
];

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

  ...wordGroup('place', ['place', 'furniture', 'meeting', 'banquet'], [
    'Table', 'Long Table', 'Table Nine', 'Conference Room', 'Card Room', 'Reading Table', 'Folding Hall', 'Empty Banquet',
  ]),
  ...wordGroup('place', ['place', 'dental', 'clinic', 'observation'], [
    'Dental Wing', 'Tooth Room', 'Oral Surgery', 'Rinse Station', 'Smile Clinic', 'Chair Bay', 'Hygiene Hall', 'Lower Jaw',
  ]),
  ...wordGroup('place', ['place', 'laundry', 'service', 'home'], [
    'Laundry Room', 'Wash House', 'Folding Area', 'Linen Hall', 'Dryer Court', 'Lost Socks', 'Pressing Room', 'Detergent Wing',
  ]),
  ...wordGroup('place', ['place', 'cinema', 'leisure', 'projection'], [
    'Cinema', 'Projection Booth', 'Screen Two', 'Picture House', 'Film Archive', 'Back Row', 'Matinee Hall', 'Empty Theatre',
  ]),
  ...wordGroup('place', ['place', 'park', 'outdoor', 'weather'], [
    'Ranger Station', 'Weather Garden', 'Picnic Ground', 'Visitor Trail', 'Lookout', 'Rain Shelter', 'Park Office', 'Fire Road',
  ]),
  ...wordGroup('place', ['place', 'civic', 'leisure', 'community'], [
    'Community Hall', 'Bingo Room', 'Social Club', 'Meeting House', 'Function Room', 'Public Lounge', 'Local Center', 'Assembly Room',
  ]),
  ...wordGroup('place', ['place', 'airport', 'transit', 'baggage'], [
    'Carousel', 'Baggage Claim', 'Lost Luggage', 'Customs Hall', 'Oversize Bags', 'Claim Area', 'Terminal Loop', 'Unclaimed Property',
  ]),

  ...wordGroup('modifier', ['meeting', 'office', 'civic'], [
    'Executive', 'Quarterly', 'Unscheduled', 'Committee', 'Mandatory', 'Adjourned', 'Consensus', 'Closed-Door',
  ]),
  ...wordGroup('modifier', ['dental', 'clinic', 'observation'], [
    'Sterile', 'Mint', 'Painless', 'Fluoride', 'Enamel', 'Clinical', 'Waiting', 'Numb',
  ]),
  ...wordGroup('modifier', ['laundry', 'service', 'home'], [
    'Washed', 'Pressed', 'Permanent Press', 'Warm Cycle', 'Unclaimed', 'Bleached', 'Folded', 'Spin',
  ]),
  ...wordGroup('modifier', ['cinema', 'projection', 'leisure'], [
    'Technicolor', 'Silent', 'Final Reel', 'Matinee', 'Wide Screen', 'Unreleased', 'Looping', 'Double Feature',
  ]),
  ...wordGroup('modifier', ['hotel', 'motel', 'hospitality'], [
    'Vacant', 'Complimentary', 'Late Checkout', 'Reserved', 'No Vacancy', 'Guest', 'Lobby', 'Do Not Disturb',
  ]),
  ...wordGroup('modifier', ['uncanny', 'time', 'liminal'], [
    'Premature', 'Postponed', 'Formerly Open', 'Almost', 'Recurring', 'Second Shift', 'Out of Sequence', 'Temporary',
  ]),

  ...wordGroup('institution', ['community', 'civic', 'leisure'], [
    'Neighborhood Association', 'Recreation Board', 'Social Committee', 'Community Trust', 'Events Council', 'Public Club', 'Local Chapter', 'Residents League',
  ]),
  ...wordGroup('institution', ['dental', 'clinic', 'hospital'], [
    'Dental Practice', 'Oral Health', 'Smile Authority', 'Hygiene Institute', 'Orthodontics', 'Tooth Council', 'Enamel Research', 'Mouth Services',
  ]),
  ...wordGroup('institution', ['cinema', 'projection', 'museum'], [
    'Film Society', 'Picture Company', 'Projection Service', 'Screen Institute', 'Reel Archive', 'Cinema Board', 'Moving Image', 'Broadcast Office',
  ]),
  ...wordGroup('institution', ['hotel', 'motel', 'hospitality'], [
    'Guest Services', 'Lodging Company', 'Housekeeping', 'Hospitality Group', 'Room Authority', 'Front Desk', 'Night Management', 'Vacancy Office',
  ]),

  ...wordGroup('instruction', ['furniture', 'meeting', 'banquet'], [
    'Take a Seat', 'Face the Table', 'Wait at Table', 'Remain Seated', 'Chairs This Way', 'Join the Meeting', 'Return Your Chair', 'Do Not Rearrange',
  ]),
  ...wordGroup('instruction', ['airport', 'transit', 'baggage'], [
    'Collect Bags At', 'Claim From', 'Leave Luggage At', 'Carousel Continues To', 'Report Missing Bags', 'Do Not Claim', 'Follow Belt To', 'Bags Return Via',
  ]),

  ...wordGroup('service', ['meeting', 'civic', 'office'], [
    'Registration', 'Minutes', 'Public Comment', 'Agenda', 'Name Badges', 'Committee Access', 'Reservations', 'Conference Services',
  ]),
  ...wordGroup('service', ['dental', 'clinic', 'observation'], [
    'Examinations', 'Cleaning', 'X-Ray', 'Rinse', 'Appointments', 'Emergency Dental', 'Waiting List', 'Aftercare',
  ]),
  ...wordGroup('service', ['cinema', 'leisure', 'community'], [
    'Tickets', 'Matinee', 'Refreshments', 'Bingo Tonight', 'Film Club', 'Late Showing', 'Intermission', 'Seat Reservations',
  ]),

  ...wordGroup('time', ['meeting', 'public', 'service'], [
    'Meeting at 4', 'Session in Progress', 'Doors at 7', 'By Appointment', 'Every Tuesday', 'Second Sitting', 'Recess Until Further Notice', 'Schedule Pending',
  ]),
  ...wordGroup('time', ['uncanny', 'liminal', 'dream'], [
    'After the Last Showing', 'Before Closing Yesterday', 'During Your Absence', 'At the Same Time', 'One Minute Remaining', 'Open Between Hours', 'Next Week Previously', 'Immediately Later',
  ]),

  ...wordGroup('place', ['place', 'night', 'celestial', 'museum'], [
    'Star Chamber', 'Moon Archive', 'Planet Hall', 'Night Observatory', 'Solar Gallery', 'Comet Annex', 'Orbit Room', 'Sky Laboratory', 'Constellation Wing', 'Eclipse Court', 'Astral Lobby', 'Meteor Office',
  ]),
  ...wordGroup('place', ['place', 'water', 'aquarium', 'maritime'], [
    'Tide Office', 'Harbor Gallery', 'Submarine Hall', 'Lighthouse Room', 'Dry Dock', 'Ocean Registry', 'Pier Terminal', 'Current Station', 'Saltwater Lobby', 'Flood Museum', 'Mariner Court', 'Deep Archive',
  ]),
  ...wordGroup('modifier', ['office', 'archive', 'civic', 'liminal'], [
    'Provisional', 'Duplicate', 'Unfiled', 'Supplementary', 'Interdepartmental', 'Misprinted', 'Counter-Signed', 'Pending', 'Unscheduled', 'Reassigned', 'Unclaimed', 'After-Hours',
  ]),
  ...wordGroup('modifier', ['material', 'museum', 'industrial'], [
    'Brass', 'Velvet', 'Porcelain', 'Chrome', 'Marble', 'Glass', 'Carpeted', 'Lacquered', 'Riveted', 'Mirrored', 'Paper', 'Wax-Sealed',
  ]),
  ...wordGroup('institution', ['dream', 'uncanny', 'archive', 'public'], [
    'Office of Lost Weather', 'Bureau of Interior Horizons', 'Committee for Previous Hours', 'Department of Empty Seating', 'Authority of Unfinished Routes', 'Registry of Borrowed Names', 'Commission for Quiet Buildings', 'Service for Duplicate Visitors', 'Institute of Delayed Arrivals', 'Board of Indoor Night', 'Archive of Unused Exits', 'Ministry of Familiar Rooms',
  ]),
  ...wordGroup('instruction', ['dream', 'uncanny', 'public', 'warning'], [
    'Wait Until Remembered', 'Keep Your Assigned Shadow', 'Use the Unnumbered Counter', 'Do Not Answer Yourself', 'Leave One Light On', 'Return Before Arrival', 'Follow the Quietest Sign', 'Present Your Previous Name', 'Remain in the Correct Weather', 'Report Familiar Corridors', 'Ignore the Second Reflection', 'Proceed Without Waking',
  ]),
  ...wordGroup('service', ['dream', 'uncanny', 'hotel', 'archive'], [
    'Shadow Check', 'Weather Storage', 'Memory Valuation', 'Name Repair', 'Dream Recording', 'Reflection Exchange', 'Lost Morning Claims', 'Temporary Face Rental', 'Corridor Reservations', 'Silence Processing', 'Previous Room Service', 'Indoor Horizon Desk',
  ]),
  ...wordGroup('time', ['night', 'dream', 'uncanny', 'service'], [
    'At 00:00 Again', 'Until the Lights Decide', 'Before the Previous Shift', 'After Your Name Is Called', 'Every Other Yesterday', 'During Indoor Weather', 'Until Further Memory', 'Between the Same Minutes', 'One Hour Before Now', 'When the Corridor Returns', 'After the Empty Train', 'Until Reception Wakes',
  ]),
  ...SIGN_WORDS_ROUND_FOUR,
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
  furniture: ['meeting', 'interior', 'banquet'],
  meeting: ['civic', 'office', 'community'],
  dental: ['clinic', 'hospital', 'observation'],
  laundry: ['service', 'home', 'motel'],
  cinema: ['leisure', 'projection', 'ceremonial'],
  projection: ['cinema', 'leisure', 'museum'],
  observatory: ['celestial', 'night', 'museum'],
  celestial: ['observatory', 'night', 'optical'],
  optical: ['projection', 'museum', 'observation'],
  broadcast: ['cinema', 'projection', 'public'],
  subterranean: ['industrial', 'service', 'restricted'],
  nursery: ['domestic', 'home', 'school'],
  domestic: ['home', 'hotel', 'interior'],
  botanical: ['nature', 'garden', 'lab'],
  maritime: ['water', 'transit', 'service'],
  baggage: ['airport', 'terminal', 'transit'],
  community: ['civic', 'leisure', 'public'],
  hospitality: ['hotel', 'motel', 'lobby'],
  ruined: ['abandoned', 'downer', 'old'],
  overgrown: ['nature', 'garden', 'upper'],
  slimed: ['wet', 'water', 'dynamic'],
  outdoor: ['environment', 'nature'],
  interior: ['environment', 'place'],
};

export const CAPTION_TAILS = [
  'Keep this notice until your name changes',
  'Present the receipt you have not received',
  'All returning visitors must wait to be remembered',
  'Service continues after the building has closed',
  'Your place in line is moving without you',
  'Please remain visible while the room is listening',
  'No announcement will repeat in the same order',
  'Report every missing minute to the nearest desk',
  'Keep your assigned shadow within the marked waiting area',
  'The next announcement applies only to previous visitors',
  'Unclaimed weather will be removed after the final shift',
  'Present all borrowed names before entering the interior corridor',
  'Service animals must remain visible to the building at all times',
  'Duplicate reflections should be surrendered at the information counter',
  'This route remains open until the room recognizes your arrival',
  'Wait beneath the smallest sign until its instructions become accurate',
  'Do not exchange seats with anyone facing the opposite direction',
  'All misplaced hours are held for collection behind reception',
  'Visitors without memories may request a temporary sequence at intake',
  'The management accepts no responsibility for familiar architecture',
  'Continue through the lobby without acknowledging the second version',
  'Your position in line will be preserved during any spatial changes',
  'Return this notice before the corridor completes its next rotation',
  'Only one member of each reflection may use this service',
  'Keep both copies until the original visitor can be identified',
  'Your assigned constellation must remain folded while inside the building',
  'Report unauthorized moonlight to the nearest staffed observation window',
  'Viewing equipment remembers every eye and may request proof of ownership',
  'The horizon is available by appointment during approved interior weather',
  'Return all telescopes facing the direction in which they were found',
  'Stars omitted from the directory are not authorized for public navigation',
  'Night service ends when the ceiling produces its first correct sunrise',
  'Declare all seeds before entering rooms with an artificial season',
  'Roots crossing marked walkways must carry a current circulation permit',
  'Watering schedules apply to furniture showing any sign of new growth',
  'Pollen collected indoors becomes property of the ventilation department',
  'Please avoid flowers that repeat instructions in a familiar voice',
  'Unregistered soil will be returned to the landscape of probable origin',
  'Garden visitors must leave with the same number of shadows',
  'Fruit found in administrative areas should be surrendered unopened',
  'All broadcasts are delayed until the audience reaches the correct room',
  'Do not adjust the picture when it begins displaying your arrival',
  'Static belongs to the station and must not leave the premises',
  'Recorded applause will continue until an appropriate event is located',
  'Subtitles may describe a neighboring room without further notice',
  'Return borrowed voices to transmission before the final test pattern',
  'Audience members appearing twice should occupy alternate rows',
  'Emergency programming begins after ordinary reality has concluded',
  'Depth restrictions remain active even when the floor appears level',
  'Maintenance echoes must be accompanied by their original mechanical sound',
  'Do not enter tunnels currently being remembered by another building',
  'Pressure changes should be reported before they acquire a personal name',
  'Every valve must remain closed except the one shown on no diagram',
  'Utility staff may ask visitors to verify the weight of the ceiling',
  'Keep loose minutes away from exposed cables and standing water',
  'Foundation listening occurs quietly beneath all scheduled announcements',
  'Children must be accompanied by the adult shown in their oldest photograph',
  'Nightlights remain active until every toy reports the same morning',
  'Blankets issued here may contain weather from a previous bedroom',
  'Please return imaginary companions through the designated service hatch',
  'The small door is reserved for visitors who remember being shorter',
  'Unclaimed lullabies will be replayed during administrative quiet hours',
  'Cradles must face away from corridors that have not been built',
  'Story time concludes only when the room accepts the ending',
  'Harbor passengers should confirm that the water travels with their vessel',
  'Tide schedules are posted according to the moon inside reception',
  'Navigation remains compulsory after all recognizable coastlines disappear',
  'Buoys heard underground must be logged with the depth registry',
  'Passengers may collect one dry reflection from the ferry office',
  'Flood routes remain valid until the arrows begin pointing upstream',
  'All borrowed oceans must be returned before the building closes',
  'Present your indoor weather permit before boarding the submerged platform',
] as const;

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
      const captionInstruction = weightedWord(rng, 'instruction', contextTags, selected);
      selected.push(captionInstruction);
      const captionService = weightedWord(rng, 'service', contextTags, selected);
      selected.push(captionService);
      const captionTime = weightedWord(rng, 'time', contextTags, selected);
      selected.push(captionTime);
      sign = {
        headline,
        caption: `${captionInstruction.text} ${captionService.text} · ${captionTime.text} · ${rng.pick(CAPTION_TAILS)}`,
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
