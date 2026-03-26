import type { IPCCriterion, AssemblyClass } from './types.js';

/**
 * IPC-A-610 workmanship criteria database.
 *
 * These are structured summaries of IPC-A-610 Rev H conditions.
 * They are NOT verbatim reproductions of IPC-A-610 text — IPC-A-610 is a paid
 * standard and its text cannot be reproduced. These are original-language
 * descriptions of observable conditions structured for use in the IPE.
 *
 * Organized by component category and step type.
 * The 'id' field is a stable Clark internal identifier — do not change existing IDs.
 */
const CRITERIA: IPCCriterion[] = [
  // ── Through-hole solder joints ─────────────────────────────────────────────
  {
    id: 'th-solder-fill-01',
    ipcSection: '7.1',
    name: 'Through-hole Solder Fill — Vertical Fill',
    description: 'Amount of solder that has wicked up through the barrel of a through-hole component.',
    componentCategory: 'through_hole',
    stepType: 'solder',
    accept: {
      '1': 'Minimum 50% vertical fill from the solder source side.',
      '2': 'Minimum 75% vertical fill from the solder source side.',
      '3': '100% vertical fill from the solder source side.',
    },
    reject: {
      '1': 'Less than 50% vertical fill.',
      '2': 'Less than 75% vertical fill.',
      '3': 'Less than 100% vertical fill, or any void visible in the barrel.',
    },
    tags: ['through-hole', 'solder', 'barrel-fill', 'vertical-fill'],
  },
  {
    id: 'th-solder-fillet-01',
    ipcSection: '7.1.3',
    name: 'Through-hole Solder Joint — Fillet Shape',
    description: 'Shape and wetting of the solder fillet on the component side and solder side of a through-hole joint.',
    componentCategory: 'through_hole',
    stepType: 'solder',
    accept: {
      '1': 'Solder has wetted the lead and pad. Concave fillet preferred but not required.',
      '2': 'Concave fillet visible on solder side. Lead outline discernible through solder.',
      '3': 'Concave fillet on both component and solder side. Lead outline clearly visible on solder side.',
    },
    reject: {
      '1': 'No wetting of lead or pad. Convex, balled solder.',
      '2': 'No concave fillet on solder side. Lead outline not visible.',
      '3': 'Any convex fillet or cold solder appearance. Lead outline not visible.',
    },
    tags: ['through-hole', 'solder', 'fillet', 'wetting'],
  },

  // ── SMD solder joints — chip components ────────────────────────────────────
  {
    id: 'smd-chip-end-joint-01',
    ipcSection: '8.3.2',
    name: 'Chip Component — End Joint Fillet',
    description: 'Solder fillet at the end termination of a chip resistor or capacitor.',
    componentCategory: 'chip_component',
    stepType: 'solder',
    accept: {
      '1': 'Minimum 25% of component height or 0.5mm fillet height, whichever is less.',
      '2': 'Minimum 50% of component height or 1mm fillet height, whichever is less.',
      '3': 'Minimum 75% of component height. No dewetting.',
    },
    reject: {
      '1': 'No measurable fillet. Component lifted more than half its height.',
      '2': 'Fillet less than 25% of component height. Dewetting.',
      '3': 'Fillet less than 50% of component height. Any dewetting or non-wetting.',
    },
    tags: ['smd', 'chip', 'resistor', 'capacitor', 'fillet', 'end-joint'],
  },
  {
    id: 'smd-chip-solder-bridge-01',
    ipcSection: '8.3.6',
    name: 'Solder Bridge — Adjacent Pads',
    description: 'Unintended solder connection bridging two adjacent pads or conductors.',
    componentCategory: 'chip_component',
    stepType: 'solder',
    accept: {
      '1': 'No bridging between conductors that would cause an electrical short.',
      '2': 'No bridging of any kind between adjacent pads.',
      '3': 'No bridging of any kind between adjacent pads.',
    },
    reject: {
      '1': 'Bridging that creates an electrical short.',
      '2': 'Any solder bridge between adjacent pads, regardless of electrical effect.',
      '3': 'Any solder bridge between adjacent pads, regardless of electrical effect.',
    },
    tags: ['smd', 'solder-bridge', 'short', 'adjacent-pads'],
  },

  // ── SMD solder joints — IC packages ────────────────────────────────────────
  {
    id: 'smd-gull-wing-fillet-01',
    ipcSection: '8.3.3',
    name: 'Gull-wing Lead — Solder Joint',
    description: 'Solder joint on a gull-wing (J-bend) SMD IC lead.',
    componentCategory: 'ic_gull_wing',
    stepType: 'solder',
    accept: {
      '1': 'Solder covers the heel. Lead outline visible through solder. No webbing between leads.',
      '2': 'Concave fillet from heel to pad. Lead side fillet present. No bridging.',
      '3': 'Concave fillet on heel, side, and toe. Lead outline clearly visible. No bridging or icicles.',
    },
    reject: {
      '1': 'No wetting at heel. Bridge between adjacent leads.',
      '2': 'No heel fillet. Bridge between adjacent leads.',
      '3': 'Any missing fillet region. Any bridge. Any icicle on toe.',
    },
    tags: ['smd', 'ic', 'gull-wing', 'fillet', 'J-bend'],
  },

  // ── Component placement ────────────────────────────────────────────────────
  {
    id: 'placement-chip-offset-01',
    ipcSection: '8.3.1',
    name: 'Chip Component — Lateral Offset',
    description: 'Side-to-side offset of a chip component from the centre of its land pattern.',
    componentCategory: 'chip_component',
    stepType: 'component_placement',
    accept: {
      '1': 'Maximum 50% of component width overhanging the land.',
      '2': 'Maximum 25% of component width overhanging the land.',
      '3': 'Maximum 25% of component width overhanging the land.',
    },
    reject: {
      '1': 'Component overhanging land by more than 50% of width.',
      '2': 'Component overhanging land by more than 25% of width.',
      '3': 'Component overhanging land by more than 25% of width.',
    },
    tags: ['smd', 'placement', 'offset', 'chip', 'land-pattern'],
  },
  {
    id: 'placement-chip-tombstone-01',
    ipcSection: '8.3.1',
    name: 'Chip Component — Tombstoning (Manhattan effect)',
    description: 'One end of a chip component has lifted off its pad, standing the component on end.',
    componentCategory: 'chip_component',
    stepType: 'component_placement',
    accept: {
      '1': 'Component is flat on both pads.',
      '2': 'Component is flat on both pads.',
      '3': 'Component is flat on both pads.',
    },
    reject: {
      '1': 'Any tombstoning or partial lift-off.',
      '2': 'Any tombstoning or partial lift-off.',
      '3': 'Any tombstoning or partial lift-off.',
    },
    tags: ['smd', 'tombstone', 'manhattan', 'lift-off', 'chip'],
  },

  // ── Board cleanliness ──────────────────────────────────────────────────────
  {
    id: 'clean-flux-residue-01',
    ipcSection: '10.2.1',
    name: 'Flux Residue — No-clean Process',
    description: 'Flux residue remaining on the board after soldering in a no-clean process.',
    componentCategory: 'board',
    stepType: 'cleanliness',
    accept: {
      '1': 'Flux residue permitted under and around components in a no-clean process.',
      '2': 'Light, clear flux residue in non-critical areas is acceptable.',
      '3': 'No visible flux residue under or between components. Board meets ionic cleanliness spec.',
    },
    reject: {
      '1': 'Heavy, dark, or charred flux residue.',
      '2': 'Any dark, thick, or charred residue. Residue that obscures joints.',
      '3': 'Any flux residue visible to the naked eye under or between components.',
    },
    tags: ['cleanliness', 'flux', 'residue', 'no-clean'],
  },

  // ── Mechanical / marking ───────────────────────────────────────────────────
  {
    id: 'mark-pcb-ident-01',
    ipcSection: '10.5',
    name: 'PCB Identification Marking — Legibility',
    description: 'Legibility of serial number, revision, and date code markings on the PCB.',
    componentCategory: 'board',
    stepType: 'marking',
    accept: {
      '1': 'Markings legible without magnification.',
      '2': 'Markings legible without magnification.',
      '3': 'All markings legible without magnification. No damage to marking area.',
    },
    reject: {
      '1': 'Serial number or revision not readable.',
      '2': 'Any required marking not readable.',
      '3': 'Any required marking not readable. Any damage to the marking area.',
    },
    tags: ['marking', 'pcb', 'serial-number', 'revision', 'legibility'],
  },
];

// ─── Query interface ──────────────────────────────────────────────────────────

/** Get all criteria applicable to a given assembly class and step type */
export function getCriteria(assemblyClass: AssemblyClass, stepType?: string): IPCCriterion[] {
  return CRITERIA.filter(c =>
    (!stepType || c.stepType === stepType),
  );
}

/** Get a single criterion by its Clark ID */
export function getCriterionById(id: string): IPCCriterion | undefined {
  return CRITERIA.find(c => c.id === id);
}

/** Search criteria by keyword (name, description, tags) */
export function searchCriteria(query: string): IPCCriterion[] {
  const q = query.toLowerCase();
  return CRITERIA.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.description.toLowerCase().includes(q) ||
    c.tags.some(t => t.includes(q)),
  );
}

/** All step types in the criteria database */
export function getStepTypes(): string[] {
  return [...new Set(CRITERIA.map(c => c.stepType))];
}

/** All component categories in the criteria database */
export function getComponentCategories(): string[] {
  return [...new Set(CRITERIA.map(c => c.componentCategory))];
}
