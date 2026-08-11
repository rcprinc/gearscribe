import { Component, OnInit } from '@angular/core';
import { FFXI_JOBS, JobAddEvent, JobItemEvent } from '../../shared/job-sidebar/job-sidebar.component';
import { PageStateService } from '../../shared/page-state.service';
import {
  DEFAULT_WEAPON_TYPE_BY_JOB,
  EquipmentSet,
  EquipmentSetService,
  GEAR_SLOTS,
  GearSlot,
  emptyGear,
} from '../../shared/equipment-set.service';
import {
  LuaDocument,
  LuaElementStateSection,
  LuaJobAbilityEntry,
  LuaMacroBookEntry,
  LuaPetEntry,
  LuaService,
  LuaSpellEntry,
  LuaStateEntry,
  emptyLuaStateEntry,
} from '../../shared/lua.service';
import { ToastService } from '../../shared/toast.service';
import { HttpErrorResponse } from '@angular/common/http';
import { GearItem, GearService, normalizeItemKey } from '../../shared/gear.service';
import { SessionService } from '../../shared/session.service';
import { JobAbilitiesService } from '../../shared/job-abilities.service';
import { SpellsService } from '../../shared/spells.service';
import { PetAbilitiesService } from '../../shared/pet-abilities.service';

const PAGE_KEY = 'luas';

const ELEMENT_CATEGORY_LABEL = 'PreCast / MidCast';

export const LUA_CATEGORIES = ['General', ELEMENT_CATEGORY_LABEL, 'Magic', 'Weapon Skill', 'Job Ability', 'Pet'];

export type GeneralState = 'Idle' | 'Engaged' | 'Resting' | 'WeaponSkill';
export type GeneralTab = GeneralState | 'Macro Book';

const GENERAL_STATES: GeneralState[] = ['Idle', 'Engaged', 'Resting', 'WeaponSkill'];
const MACRO_BOOK_TAB = 'Macro Book' as const;

export type PrecastMidcastState = 'PreCast' | 'MidCast';
export type ElementCategory = 'General' | 'Fire' | 'Earth' | 'Water' | 'Wind' | 'Ice' | 'Light' | 'Dark';

const PRECAST_MIDCAST_STATES: PrecastMidcastState[] = ['PreCast', 'MidCast'];
const ELEMENT_CATEGORIES: ElementCategory[] = ['General', 'Fire', 'Earth', 'Water', 'Wind', 'Ice', 'Light', 'Dark'];

function precastMidcastKey(state: PrecastMidcastState): 'precast' | 'midcast' {
  return state.toLowerCase() as 'precast' | 'midcast';
}

function elementKey(element: ElementCategory): keyof LuaElementStateSection {
  return element.toLowerCase() as keyof LuaElementStateSection;
}

function emptyElementRecord<T>(value: T): Record<ElementCategory, T> {
  return {
    General: value,
    Fire: value,
    Earth: value,
    Water: value,
    Wind: value,
    Ice: value,
    Light: value,
    Dark: value,
  };
}

const LUA_SLOT_FIELDS: { key: string; field: string }[] = [
  { key: 'main', field: 'Main' },
  { key: 'sub', field: 'Sub' },
  { key: 'ranged', field: 'Range' },
  { key: 'ammo', field: 'Ammo' },
  { key: 'head', field: 'Head' },
  { key: 'neck', field: 'Neck' },
  { key: 'ear1', field: 'Ear1' },
  { key: 'ear2', field: 'Ear2' },
  { key: 'body', field: 'Body' },
  { key: 'hands', field: 'Hands' },
  { key: 'ring1', field: 'Ring1' },
  { key: 'ring2', field: 'Ring2' },
  { key: 'back', field: 'Back' },
  { key: 'waist', field: 'Waist' },
  { key: 'legs', field: 'Legs' },
  { key: 'feet', field: 'Feet' },
];

function stateKey(state: GeneralState): 'idle' | 'engaged' | 'resting' | 'weaponSkill' {
  switch (state) {
    case 'Idle':
      return 'idle';
    case 'Engaged':
      return 'engaged';
    case 'Resting':
      return 'resting';
    case 'WeaponSkill':
      return 'weaponSkill';
  }
}

@Component({
  selector: 'app-luas',
  templateUrl: './luas.component.html',
  styleUrls: ['./luas.component.scss']
})
export class LuasComponent implements OnInit {
  selectedJob: string | null = null;
  selectedSubjob: string | null = null;
  pickingSubjob = false;

  readonly categories = LUA_CATEGORIES;
  readonly generalStates = GENERAL_STATES;
  readonly precastMidcastStates = PRECAST_MIDCAST_STATES;
  readonly elementCategories = ELEMENT_CATEGORIES;

  generalModalOpen = false;
  activeGeneralTab: GeneralTab | null = null;
  generalTextByState: Record<GeneralState, string> = { Idle: '', Engaged: '', Resting: '', WeaponSkill: '' };
  selectedSetNameByState: Record<GeneralState, string | null> = { Idle: null, Engaged: null, Resting: null, WeaponSkill: null };

  elementModalOpen = false;
  activePrecastMidcast: PrecastMidcastState = 'PreCast';
  activeElement: ElementCategory | null = null;
  elementTextByState: Record<PrecastMidcastState, Record<ElementCategory, string>> = {
    PreCast: emptyElementRecord(''),
    MidCast: emptyElementRecord(''),
  };
  elementSetNameByState: Record<PrecastMidcastState, Record<ElementCategory, string | null>> = {
    PreCast: emptyElementRecord(null),
    MidCast: emptyElementRecord(null),
  };

  private manualGearTarget:
    | { kind: 'general'; state: GeneralState }
    | { kind: 'element'; state: PrecastMidcastState; element: ElementCategory }
    | { kind: 'jobAbility'; index: number }
    | { kind: 'spell'; index: number }
    | { kind: 'pet'; index: number }
    | null = null;

  jobAbilityCatalog: Record<string, string[]> = {};
  jobAbilityEntries: LuaJobAbilityEntry[] = [];

  jobAbilityModalOpen = false;
  activeJobAbilityName: string | null = null;
  editingJobAbilityIndex: number | null = null;

  jobAbilityPickerOpen = false;
  jobAbilityPickerSearch = '';
  jobAbilityPickerExpanded = false;
  jobAbilityPickerSelected: string | null = null;

  spellCatalog: Record<string, string[]> = {};
  spellEntries: LuaSpellEntry[] = [];

  magicModalOpen = false;
  activeSpellName: string | null = null;
  editingSpellIndex: number | null = null;

  spellPickerOpen = false;
  spellPickerSearch = '';
  spellPickerLimitToJob = false;
  spellPickerSelected: string | null = null;

  petAbilityCatalog: Record<string, string[]> = {};
  petEntries: LuaPetEntry[] = [];

  petModalOpen = false;
  activePetAbilityName: string | null = null;
  editingPetIndex: number | null = null;

  petPickerOpen = false;
  petPickerSearch = '';
  petPickerLimitToJob = false;
  petPickerSelected: string | null = null;

  allEquipmentSets: EquipmentSet[] = [];
  subjobDocs: LuaDocument[] = [];
  savedSubjobs: Record<string, string[]> = {};

  macroBookValue = '';
  macroSetValue = '';
  macroBookText = '';

  manualGearModalOpen = false;
  manualGearSlots = GEAR_SLOTS;
  pickerGear: Record<string, string | null> = emptyGear();
  pickerActiveSlot: GearSlot | null = null;
  pickerGearOptions: GearItem[] = [];
  pickerSearchText = '';
  pickerMaxLevel: number | null = null;
  pickerWeaponType = '';
  pickerShowDetails = true;
  pickerStatFilterSections: { section: string; options: string[] }[] = [];
  pickerSelectedStatFilters = new Set<string>();
  pickerShowFilterModal = false;
  pickerSignedIn = false;
  pickerOwnedOnly = true;
  pickerOwnedItemKeys = new Set<string>();

  constructor(
    private pageStateService: PageStateService,
    private equipmentSetService: EquipmentSetService,
    private luaService: LuaService,
    private toastService: ToastService,
    private gearService: GearService,
    private sessionService: SessionService,
    private jobAbilitiesService: JobAbilitiesService,
    private spellsService: SpellsService,
    private petAbilitiesService: PetAbilitiesService,
  ) {}

  ngOnInit(): void {
    const last = this.pageStateService.get(PAGE_KEY);
    if (last.job) {
      this.selectedJob = last.job;
      this.selectedSubjob = last.name;
    }

    this.equipmentSetService.list().subscribe((sets) => {
      this.allEquipmentSets = sets;
    });

    this.loadSavedSubjobs();

    this.jobAbilitiesService.getAll().subscribe((catalog) => {
      this.jobAbilityCatalog = catalog;
    });

    this.spellsService.getAll().subscribe((catalog) => {
      this.spellCatalog = catalog;
    });

    this.petAbilitiesService.getAll().subscribe((catalog) => {
      this.petAbilityCatalog = catalog;
    });

    this.gearService.getStatFilterOptions().subscribe((data) => {
      this.pickerStatFilterSections = Object.entries(data).map(([section, options]) => ({ section, options }));
    });

    this.sessionService.session$.subscribe((session) => {
      this.pickerSignedIn = session.signedIn;
      if (session.signedIn) {
        this.gearService.getOwnedItemKeys().subscribe((keys) => {
          this.pickerOwnedItemKeys = new Set(keys);
        });
      } else {
        this.pickerOwnedItemKeys = new Set();
      }
    });

    if (this.selectedJob) {
      this.loadLuaData();
    }
  }

  onJobSelected(event: JobAddEvent): void {
    this.selectedJob = event.job;
    this.selectedSubjob = null;
    this.pickingSubjob = false;
    this.pageStateService.set(PAGE_KEY, { job: event.job, name: null });
    this.loadLuaData();
  }

  onAddSubjob(event: JobAddEvent): void {
    this.selectedJob = event.job;
    this.selectedSubjob = null;
    this.pickingSubjob = true;
  }

  subjobChoicesFor(job: string): string[] {
    return FFXI_JOBS.filter((j) => j !== job);
  }

  chooseSubjob(subjob: string): void {
    if (!this.selectedJob) {
      return;
    }
    this.selectedSubjob = subjob;
    this.pickingSubjob = false;
    this.pageStateService.set(PAGE_KEY, { job: this.selectedJob, name: subjob });
    this.loadLuaData();
  }

  onSelectSubjob(event: JobItemEvent): void {
    this.selectedJob = event.job;
    this.selectedSubjob = event.name;
    this.pickingSubjob = false;
    this.pageStateService.set(PAGE_KEY, { job: event.job, name: event.name });
    this.loadLuaData();
  }

  visibleCategories(): string[] {
    return this.selectedSubjob
      ? this.categories.filter((category) => category !== ELEMENT_CATEGORY_LABEL)
      : this.categories;
  }

  onCategoryClick(category: string): void {
    if (category === 'General') {
      this.openGeneralModal();
    } else if (category === ELEMENT_CATEGORY_LABEL) {
      this.openElementModal();
    } else if (category === 'Job Ability') {
      this.openJobAbilityModal();
    } else if (category === 'Magic') {
      this.openMagicModal();
    } else if (category === 'Pet') {
      this.openPetModal();
    }
  }

  openGeneralModal(): void {
    this.generalModalOpen = true;
    this.activeGeneralTab = 'Idle';
  }

  openElementModal(): void {
    this.elementModalOpen = true;
    this.activePrecastMidcast = 'PreCast';
    this.activeElement = 'General';
  }

  closeElementModal(): void {
    this.elementModalOpen = false;
    this.activeElement = null;
  }

  selectPrecastMidcast(state: PrecastMidcastState): void {
    this.activePrecastMidcast = state;
  }

  selectElement(element: ElementCategory): void {
    this.activeElement = element;
  }

  openJobAbilityModal(): void {
    this.jobAbilityModalOpen = true;
    this.activeJobAbilityName = null;
    this.editingJobAbilityIndex = null;
  }

  closeJobAbilityModal(): void {
    this.jobAbilityModalOpen = false;
    this.activeJobAbilityName = null;
    this.editingJobAbilityIndex = null;
  }

  openJobAbilityPickerForAdd(): void {
    this.editingJobAbilityIndex = null;
    this.jobAbilityPickerSearch = '';
    this.jobAbilityPickerExpanded = false;
    this.jobAbilityPickerSelected = null;
    this.jobAbilityPickerOpen = true;
  }

  openJobAbilityPickerForEdit(index: number): void {
    this.editingJobAbilityIndex = index;
    this.jobAbilityPickerSearch = '';
    this.jobAbilityPickerExpanded = false;
    this.jobAbilityPickerSelected = this.jobAbilityEntries[index].abilityName;
    this.jobAbilityPickerOpen = true;
  }

  closeJobAbilityPicker(): void {
    this.jobAbilityPickerOpen = false;
  }

  selectJobAbilityPickerOption(name: string): void {
    this.jobAbilityPickerSelected = name;
  }

  expandJobAbilityPickerToAllJobs(): void {
    this.jobAbilityPickerExpanded = true;
  }

  jobAbilityPickerOptions(): { abilityName: string; job: string }[] {
    const currentJob = this.selectedJob ?? '';
    const currentJobAbilities = (this.jobAbilityCatalog[currentJob] ?? [])
      .map((name) => ({ abilityName: name, job: currentJob }));

    let source: { abilityName: string; job: string }[];
    if (this.jobAbilityPickerExpanded) {
      const others = Object.entries(this.jobAbilityCatalog)
        .filter(([job]) => job !== currentJob)
        .flatMap(([job, names]) => names.map((name) => ({ abilityName: name, job })));
      source = [...currentJobAbilities, ...others];
    } else {
      source = currentJobAbilities;
    }

    const search = this.jobAbilityPickerSearch.trim().toLowerCase();
    return search ? source.filter((opt) => opt.abilityName.toLowerCase().includes(search)) : source;
  }

  confirmJobAbilityPicker(): void {
    const name = this.jobAbilityPickerSelected;
    if (!name) {
      return;
    }

    if (this.editingJobAbilityIndex !== null) {
      const entry = this.jobAbilityEntries[this.editingJobAbilityIndex];
      const gear = this.parseGearFromLua(entry.lua);
      entry.abilityName = name;
      entry.lua = this.buildJobAbilityLuaTable(name, gear);
    } else {
      this.jobAbilityEntries.push({ abilityName: name, equipmentSet: null, lua: this.emptyJobAbilityWrapper(name) });
      this.editingJobAbilityIndex = this.jobAbilityEntries.length - 1;
    }

    this.activeJobAbilityName = name;
    this.jobAbilityPickerOpen = false;
  }

  applyJobAbilityEquipmentSet(set: EquipmentSet): void {
    if (this.editingJobAbilityIndex === null) {
      return;
    }
    const entry = this.jobAbilityEntries[this.editingJobAbilityIndex];
    entry.equipmentSet = set.name;
    entry.lua = this.buildJobAbilityLuaTable(entry.abilityName, this.resolveDisplayGear(set));
  }

  openJobAbilityManualGearModal(): void {
    if (this.editingJobAbilityIndex === null) {
      return;
    }
    const entry = this.jobAbilityEntries[this.editingJobAbilityIndex];
    this.manualGearTarget = { kind: 'jobAbility', index: this.editingJobAbilityIndex };
    this.beginManualGearPicker(entry.lua);
  }

  saveJobAbility(): void {
    this.saveLuaDocument(() => {
      this.activeJobAbilityName = null;
      this.editingJobAbilityIndex = null;
    });
  }

  openMagicModal(): void {
    this.magicModalOpen = true;
    this.activeSpellName = null;
    this.editingSpellIndex = null;
  }

  closeMagicModal(): void {
    this.magicModalOpen = false;
    this.activeSpellName = null;
    this.editingSpellIndex = null;
  }

  openSpellPickerForAdd(): void {
    this.editingSpellIndex = null;
    this.spellPickerSearch = '';
    this.spellPickerLimitToJob = false;
    this.spellPickerSelected = null;
    this.spellPickerOpen = true;
  }

  openSpellPickerForEdit(index: number): void {
    this.editingSpellIndex = index;
    this.spellPickerSearch = '';
    this.spellPickerLimitToJob = false;
    this.spellPickerSelected = this.spellEntries[index].spellName;
    this.spellPickerOpen = true;
  }

  closeSpellPicker(): void {
    this.spellPickerOpen = false;
  }

  selectSpellPickerOption(name: string): void {
    this.spellPickerSelected = name;
  }

  spellPickerOptions(): { spellName: string; job: string }[] {
    const currentJob = this.selectedJob ?? '';
    const currentJobSpells = (this.spellCatalog[currentJob] ?? [])
      .map((name) => ({ spellName: name, job: currentJob }));

    let source: { spellName: string; job: string }[];
    if (this.spellPickerLimitToJob) {
      source = currentJobSpells;
    } else {
      const others = Object.entries(this.spellCatalog)
        .filter(([job]) => job !== currentJob)
        .flatMap(([job, names]) => names.map((name) => ({ spellName: name, job })));
      source = [...currentJobSpells, ...others];
    }

    const search = this.spellPickerSearch.trim().toLowerCase();
    if (!search) {
      return source;
    }

    const matched = source.filter((opt) => opt.spellName.toLowerCase().includes(search));
    const seenNames = new Set<string>();
    return matched.filter((opt) => {
      if (seenNames.has(opt.spellName)) {
        return false;
      }
      seenNames.add(opt.spellName);
      return true;
    });
  }

  confirmSpellPicker(): void {
    const name = this.spellPickerSelected;
    if (!name) {
      return;
    }

    if (this.editingSpellIndex !== null) {
      const entry = this.spellEntries[this.editingSpellIndex];
      const gear = this.parseGearFromLua(entry.lua);
      entry.spellName = name;
      entry.lua = this.buildSpellLuaTable(name, gear);
    } else {
      this.spellEntries.push({ spellName: name, equipmentSet: null, lua: this.emptySpellWrapper(name) });
      this.editingSpellIndex = this.spellEntries.length - 1;
    }

    this.activeSpellName = name;
    this.spellPickerOpen = false;
  }

  applySpellEquipmentSet(set: EquipmentSet): void {
    if (this.editingSpellIndex === null) {
      return;
    }
    const entry = this.spellEntries[this.editingSpellIndex];
    entry.equipmentSet = set.name;
    entry.lua = this.buildSpellLuaTable(entry.spellName, this.resolveDisplayGear(set));
  }

  openSpellManualGearModal(): void {
    if (this.editingSpellIndex === null) {
      return;
    }
    const entry = this.spellEntries[this.editingSpellIndex];
    this.manualGearTarget = { kind: 'spell', index: this.editingSpellIndex };
    this.beginManualGearPicker(entry.lua);
  }

  saveMagic(): void {
    this.saveLuaDocument(() => {
      this.activeSpellName = null;
      this.editingSpellIndex = null;
    });
  }

  openPetModal(): void {
    this.petModalOpen = true;
    this.activePetAbilityName = null;
    this.editingPetIndex = null;
  }

  closePetModal(): void {
    this.petModalOpen = false;
    this.activePetAbilityName = null;
    this.editingPetIndex = null;
  }

  openPetPickerForAdd(): void {
    this.editingPetIndex = null;
    this.petPickerSearch = '';
    this.petPickerLimitToJob = false;
    this.petPickerSelected = null;
    this.petPickerOpen = true;
  }

  openPetPickerForEdit(index: number): void {
    this.editingPetIndex = index;
    this.petPickerSearch = '';
    this.petPickerLimitToJob = false;
    this.petPickerSelected = this.petEntries[index].abilityName;
    this.petPickerOpen = true;
  }

  closePetPicker(): void {
    this.petPickerOpen = false;
  }

  selectPetPickerOption(name: string): void {
    this.petPickerSelected = name;
  }

  petPickerOptions(): { abilityName: string; job: string }[] {
    const currentJob = this.selectedJob ?? '';
    const currentJobAbilities = (this.petAbilityCatalog[currentJob] ?? [])
      .map((name) => ({ abilityName: name, job: currentJob }));

    let source: { abilityName: string; job: string }[];
    if (this.petPickerLimitToJob) {
      source = currentJobAbilities;
    } else {
      const others = Object.entries(this.petAbilityCatalog)
        .filter(([job]) => job !== currentJob)
        .flatMap(([job, names]) => names.map((name) => ({ abilityName: name, job })));
      source = [...currentJobAbilities, ...others];
    }

    const search = this.petPickerSearch.trim().toLowerCase();
    if (!search) {
      return source;
    }

    const matched = source.filter((opt) => opt.abilityName.toLowerCase().includes(search));
    const seenNames = new Set<string>();
    return matched.filter((opt) => {
      if (seenNames.has(opt.abilityName)) {
        return false;
      }
      seenNames.add(opt.abilityName);
      return true;
    });
  }

  confirmPetPicker(): void {
    const name = this.petPickerSelected;
    if (!name) {
      return;
    }

    if (this.editingPetIndex !== null) {
      const entry = this.petEntries[this.editingPetIndex];
      const gear = this.parseGearFromLua(entry.lua);
      entry.abilityName = name;
      entry.lua = this.buildPetLuaTable(name, gear);
    } else {
      this.petEntries.push({ abilityName: name, equipmentSet: null, lua: this.emptyPetWrapper(name) });
      this.editingPetIndex = this.petEntries.length - 1;
    }

    this.activePetAbilityName = name;
    this.petPickerOpen = false;
  }

  applyPetEquipmentSet(set: EquipmentSet): void {
    if (this.editingPetIndex === null) {
      return;
    }
    const entry = this.petEntries[this.editingPetIndex];
    entry.equipmentSet = set.name;
    entry.lua = this.buildPetLuaTable(entry.abilityName, this.resolveDisplayGear(set));
  }

  openPetManualGearModal(): void {
    if (this.editingPetIndex === null) {
      return;
    }
    const entry = this.petEntries[this.editingPetIndex];
    this.manualGearTarget = { kind: 'pet', index: this.editingPetIndex };
    this.beginManualGearPicker(entry.lua);
  }

  savePetAbility(): void {
    this.saveLuaDocument(() => {
      this.activePetAbilityName = null;
      this.editingPetIndex = null;
    });
  }

  modalTabs(): GeneralTab[] {
    return this.selectedSubjob ? this.generalStates : [...this.generalStates, MACRO_BOOK_TAB];
  }

  activeState(): GeneralState | null {
    if (!this.activeGeneralTab || this.activeGeneralTab === MACRO_BOOK_TAB) {
      return null;
    }
    return this.activeGeneralTab;
  }

  onMacroBookInputChange(): void {
    const book = this.macroBookValue.trim();
    const set = this.macroSetValue.trim();
    this.macroBookText = book && set ? this.buildMacroBookLua(book, set) : '';
  }

  combinedSetsText(): string {
    const generalBlocks = this.generalStates.map((state) => this.generalTextByState[state]);
    const elementBlocks = this.selectedSubjob
      ? []
      : this.precastMidcastStates
          .map((state) => this.buildPrecastMidcastBlock(state))
          .filter((block): block is string => block !== null);
    const jobAbilityBlocks = this.jobAbilityEntries.map((entry) => entry.lua);
    const spellBlocks = this.spellEntries.map((entry) => entry.lua);
    const petBlocks = this.petEntries.map((entry) => entry.lua);
    const own = [
      `local ${this.setsLabel(this.selectedSubjob)} = {`,
      ...generalBlocks,
      ...elementBlocks,
      ...jobAbilityBlocks,
      ...spellBlocks,
      ...petBlocks,
      '}',
    ].join('\n');

    if (this.selectedSubjob) {
      return own;
    }

    const subjobBlocks = this.subjobDocs.map((doc) => this.combinedTextForDoc(doc));
    const parts = ['local profile = {};', own, ...subjobBlocks];

    parts.push(this.buildHandleDefaultLua());
    parts.push(this.buildHandleWeaponskillLua());

    const abilityLua = this.buildHandleAbilityLua();
    if (abilityLua) {
      parts.push(abilityLua);
    }

    parts.push(this.buildOnLoadLua());

    const precastLua = this.buildHandlePrecastLua();
    if (precastLua) {
      parts.push('');
      parts.push(precastLua);
    }

    const midcastLua = this.buildHandleMidcastLua();
    if (midcastLua) {
      parts.push('');
      parts.push(midcastLua);
    }

    parts.push('');
    parts.push(this.buildProfileClosingLua());

    return parts.join('\n');
  }

  updateLuaFile(): void {
    if (!this.selectedJob) {
      return;
    }

    this.luaService.updateFile(this.selectedJob, this.combinedSetsText()).subscribe({
      next: () => this.toastService.show('Updated'),
      error: (err: HttpErrorResponse) => {
        const message = err.error?.message ?? 'Something went wrong updating the file.';
        window.alert(message);
      },
    });
  }

  private loadLuaData(): void {
    this.generalTextByState = {
      Idle: this.emptyLuaWrapper('Idle'),
      Engaged: this.emptyLuaWrapper('Engaged'),
      Resting: this.emptyLuaWrapper('Resting'),
      WeaponSkill: this.emptyLuaWrapper('WeaponSkill'),
    };
    this.selectedSetNameByState = { Idle: null, Engaged: null, Resting: null, WeaponSkill: null };
    this.elementTextByState = {
      PreCast: this.buildEmptyElementTextRecord(),
      MidCast: this.buildEmptyElementTextRecord(),
    };
    this.elementSetNameByState = {
      PreCast: emptyElementRecord(null),
      MidCast: emptyElementRecord(null),
    };
    this.jobAbilityEntries = [];
    this.spellEntries = [];
    this.petEntries = [];
    this.subjobDocs = [];
    this.macroBookValue = '';
    this.macroSetValue = '';
    this.macroBookText = '';

    if (!this.selectedJob) {
      return;
    }

    this.luaService.get(this.selectedJob, this.selectedSubjob).subscribe({
      next: (doc) => this.applyLoadedDocument(doc),
      error: () => {
        // No saved Lua yet for this job/subjob — keep the blank defaults.
      },
    });

    if (!this.selectedSubjob) {
      this.luaService.listSubjobs(this.selectedJob).subscribe((docs) => {
        this.subjobDocs = docs;
      });
    }
  }

  closeGeneralModal(): void {
    this.generalModalOpen = false;
    this.activeGeneralTab = null;
  }

  selectGeneralTab(tab: GeneralTab): void {
    this.activeGeneralTab = tab;
  }

  equipmentSetsForJob(): EquipmentSet[] {
    return this.allEquipmentSets.filter((set) => set.job === this.selectedJob);
  }

  applyEquipmentSet(set: EquipmentSet): void {
    const state = this.activeState();
    if (!state) {
      return;
    }
    this.selectedSetNameByState[state] = set.name;
    this.generalTextByState[state] = this.buildLuaTable(state, this.resolveDisplayGear(set));
  }

  applyElementEquipmentSet(set: EquipmentSet): void {
    const element = this.activeElement;
    if (!element) {
      return;
    }
    const state = this.activePrecastMidcast;
    this.elementSetNameByState[state][element] = set.name;
    this.elementTextByState[state][element] = this.buildElementLuaTable(state, element, this.resolveDisplayGear(set));
  }

  private resolveDisplayGear(set: EquipmentSet): Record<string, string | null> {
    const resolved: Record<string, string | null> = { ...set.gear };
    if (set.shortNames) {
      for (const key of Object.keys(resolved)) {
        const shortName = set.shortNames[key];
        if (shortName) {
          // shortNames are pre-escaped for direct Lua embedding at save time;
          // undo that here so buildLuaTable's own escaping isn't applied twice.
          resolved[key] = shortName.replace(/\\'/g, "'");
        }
      }
    }
    return resolved;
  }

  openManualGearModal(): void {
    const state = this.activeState();
    if (!state) {
      return;
    }
    this.manualGearTarget = { kind: 'general', state };
    this.beginManualGearPicker(this.generalTextByState[state]);
  }

  openElementManualGearModal(): void {
    const element = this.activeElement;
    if (!element) {
      return;
    }
    const state = this.activePrecastMidcast;
    this.manualGearTarget = { kind: 'element', state, element };
    this.beginManualGearPicker(this.elementTextByState[state][element]);
  }

  private beginManualGearPicker(currentLua: string): void {
    this.pickerGear = this.parseGearFromLua(currentLua);
    this.pickerActiveSlot = null;
    this.pickerGearOptions = [];
    this.pickerSearchText = '';
    this.pickerMaxLevel = null;
    this.pickerWeaponType = '';
    this.pickerShowDetails = true;
    this.pickerOwnedOnly = true;
    this.pickerSelectedStatFilters.clear();
    this.manualGearModalOpen = true;
  }

  closeManualGearModal(): void {
    this.manualGearModalOpen = false;
    this.manualGearTarget = null;
    this.pickerActiveSlot = null;
    this.pickerGearOptions = [];
  }

  onPickerSlotClick(slot: GearSlot): void {
    this.pickerActiveSlot = slot;
    this.pickerSearchText = '';
    this.pickerMaxLevel = null;
    this.pickerWeaponType = slot.key === 'main'
      ? (DEFAULT_WEAPON_TYPE_BY_JOB[this.selectedJob ?? ''] ?? '')
      : '';
    this.pickerOwnedOnly = true;
    this.pickerGearOptions = [];
    this.gearService.getGearForSlot(slot.key, this.selectedJob).subscribe((items) => {
      this.pickerGearOptions = items;
    });
  }

  closePickerSlot(): void {
    this.pickerActiveSlot = null;
    this.pickerGearOptions = [];
  }

  selectPickerGear(item: GearItem): void {
    if (!this.pickerActiveSlot || !this.manualGearTarget) {
      return;
    }
    this.pickerGear = { ...this.pickerGear, [this.pickerActiveSlot.key]: item.name };
    this.applyManualGearTarget();
    this.closePickerSlot();
  }

  removePickerGear(slot: GearSlot, event: Event): void {
    event.stopPropagation();
    if (!this.manualGearTarget) {
      return;
    }
    this.pickerGear = { ...this.pickerGear, [slot.key]: null };
    this.applyManualGearTarget();
  }

  private applyManualGearTarget(): void {
    const target = this.manualGearTarget;
    if (!target) {
      return;
    }
    if (target.kind === 'general') {
      this.selectedSetNameByState[target.state] = null;
      this.generalTextByState[target.state] = this.buildLuaTable(target.state, this.pickerGear);
    } else if (target.kind === 'element') {
      this.elementSetNameByState[target.state][target.element] = null;
      this.elementTextByState[target.state][target.element] = this.buildElementLuaTable(target.state, target.element, this.pickerGear);
    } else if (target.kind === 'jobAbility') {
      const entry = this.jobAbilityEntries[target.index];
      entry.equipmentSet = null;
      entry.lua = this.buildJobAbilityLuaTable(entry.abilityName, this.pickerGear);
    } else if (target.kind === 'spell') {
      const entry = this.spellEntries[target.index];
      entry.equipmentSet = null;
      entry.lua = this.buildSpellLuaTable(entry.spellName, this.pickerGear);
    } else {
      const entry = this.petEntries[target.index];
      entry.equipmentSet = null;
      entry.lua = this.buildPetLuaTable(entry.abilityName, this.pickerGear);
    }
  }

  filteredPickerGear(): GearItem[] {
    const search = this.pickerSearchText.trim().toLowerCase();
    return this.pickerGearOptions
      .filter((item) => {
        if (!this.matchesJob(item)) {
          return false;
        }
        if (search && !item.name.toLowerCase().includes(search)) {
          return false;
        }
        if (this.pickerMaxLevel != null && item.level > this.pickerMaxLevel) {
          return false;
        }
        if (this.pickerWeaponType && item.weaponType !== this.pickerWeaponType) {
          return false;
        }
        if (!this.matchesPickerStatFilters(item)) {
          return false;
        }
        if (this.pickerSignedIn && this.pickerOwnedOnly && !this.pickerOwnedItemKeys.has(normalizeItemKey(item.name))) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
  }

  openPickerFilterModal(): void {
    this.pickerShowFilterModal = true;
  }

  closePickerFilterModal(): void {
    this.pickerShowFilterModal = false;
  }

  togglePickerStatFilter(stat: string): void {
    if (this.pickerSelectedStatFilters.has(stat)) {
      this.pickerSelectedStatFilters.delete(stat);
    } else {
      this.pickerSelectedStatFilters.add(stat);
    }
  }

  clearPickerStatFilters(): void {
    this.pickerSelectedStatFilters.clear();
  }

  pickerAvailableWeaponTypes(): string[] {
    const types = new Set<string>();
    for (const item of this.pickerGearOptions) {
      if (item.weaponType) {
        types.add(item.weaponType);
      }
    }
    return Array.from(types).sort();
  }

  saveGeneral(): void {
    this.saveLuaDocument(() => this.closeGeneralModal());
  }

  saveElement(): void {
    this.saveLuaDocument(() => this.closeElementModal());
  }

  private saveLuaDocument(afterSave: () => void): void {
    if (!this.selectedJob) {
      return;
    }

    this.luaService.save(this.buildLuaDocument()).subscribe(() => {
      this.toastService.show('Saved');
      afterSave();
      this.loadSavedSubjobs();
    });
  }

  private loadSavedSubjobs(): void {
    this.luaService.listAllSubjobs().subscribe((grouped) => {
      this.savedSubjobs = grouped;
    });
  }

  private buildLuaDocument(): LuaDocument {
    return {
      job: this.selectedJob!,
      subjob: this.selectedSubjob,
      sections: {
        general: {
          idle: this.entryFor('Idle'),
          engaged: this.entryFor('Engaged'),
          resting: this.entryFor('Resting'),
          weaponSkill: this.entryFor('WeaponSkill'),
        },
        element: {
          precast: this.elementSectionFor('PreCast'),
          midcast: this.elementSectionFor('MidCast'),
        },
        jobAbilities: this.jobAbilityEntries.map((entry) => ({ ...entry })),
        spells: this.spellEntries.map((entry) => ({ ...entry })),
        petAbilities: this.petEntries.map((entry) => ({ ...entry })),
        macroBook: !this.selectedSubjob && this.macroBookValue.trim() && this.macroSetValue.trim()
          ? { book: this.macroBookValue.trim(), set: this.macroSetValue.trim() }
          : null,
      },
    };
  }

  private entryFor(state: GeneralState): LuaStateEntry {
    return {
      equipmentSet: this.selectedSetNameByState[state],
      lua: this.generalTextByState[state],
    };
  }

  private elementSectionFor(state: PrecastMidcastState): LuaElementStateSection {
    return {
      general: this.elementEntryFor(state, 'General'),
      fire: this.elementEntryFor(state, 'Fire'),
      earth: this.elementEntryFor(state, 'Earth'),
      water: this.elementEntryFor(state, 'Water'),
      wind: this.elementEntryFor(state, 'Wind'),
      ice: this.elementEntryFor(state, 'Ice'),
      light: this.elementEntryFor(state, 'Light'),
      dark: this.elementEntryFor(state, 'Dark'),
    };
  }

  private elementEntryFor(state: PrecastMidcastState, element: ElementCategory): LuaStateEntry {
    return {
      equipmentSet: this.elementSetNameByState[state][element],
      lua: this.elementTextByState[state][element],
    };
  }

  private applyLoadedDocument(doc: LuaDocument): void {
    const general = doc.sections?.general;
    for (const state of this.generalStates) {
      const entry: LuaStateEntry = general?.[stateKey(state)] ?? emptyLuaStateEntry();
      this.generalTextByState[state] = entry.lua?.trim() ? entry.lua : this.emptyLuaWrapper(state);
      this.selectedSetNameByState[state] = entry.equipmentSet ?? null;
    }

    const element = doc.sections?.element;
    for (const pmState of this.precastMidcastStates) {
      const stateSection = element?.[precastMidcastKey(pmState)];
      for (const el of this.elementCategories) {
        const entry: LuaStateEntry = stateSection?.[elementKey(el)] ?? emptyLuaStateEntry();
        this.elementTextByState[pmState][el] = entry.lua?.trim() ? entry.lua : this.emptyElementLuaWrapper(el);
        this.elementSetNameByState[pmState][el] = entry.equipmentSet ?? null;
      }
    }

    this.jobAbilityEntries = (doc.sections?.jobAbilities ?? []).map((entry) => ({
      abilityName: entry.abilityName,
      equipmentSet: entry.equipmentSet ?? null,
      lua: entry.lua?.trim() ? entry.lua : this.emptyJobAbilityWrapper(entry.abilityName),
    }));

    this.spellEntries = (doc.sections?.spells ?? []).map((entry) => ({
      spellName: entry.spellName,
      equipmentSet: entry.equipmentSet ?? null,
      lua: entry.lua?.trim() ? entry.lua : this.emptySpellWrapper(entry.spellName),
    }));

    this.petEntries = (doc.sections?.petAbilities ?? []).map((entry) => ({
      abilityName: entry.abilityName,
      equipmentSet: entry.equipmentSet ?? null,
      lua: entry.lua?.trim() ? entry.lua : this.emptyPetWrapper(entry.abilityName),
    }));

    const macroBook: LuaMacroBookEntry | null | undefined = doc.sections?.macroBook;
    this.macroBookValue = macroBook?.book ?? '';
    this.macroSetValue = macroBook?.set ?? '';
    this.macroBookText = macroBook?.book && macroBook?.set
      ? this.buildMacroBookLua(macroBook.book, macroBook.set)
      : '';
  }

  private buildLuaTable(state: GeneralState, gear: Record<string, string | null>): string {
    const fieldLines = LUA_SLOT_FIELDS
      .filter(({ key }) => !!gear[key])
      .map(({ key, field }) => `        ${field} = '${this.escapeLuaString(gear[key]!)}',`);
    return [`    ${this.stateLabel(state, this.selectedSubjob)} = {`, ...fieldLines, `    },`].join('\n');
  }

  private buildElementLuaTable(state: PrecastMidcastState, element: ElementCategory, gear: Record<string, string | null>): string {
    const fieldLines = LUA_SLOT_FIELDS
      .filter(({ key }) => !!gear[key])
      .map(({ key, field }) => `            ${field} = '${this.escapeLuaString(gear[key]!)}',`);
    return [`        ${this.elementLabel(element, this.selectedSubjob)} = {`, ...fieldLines, `        },`].join('\n');
  }

  private escapeLuaString(value: string): string {
    return value.replace(/'/g, "\\'");
  }

  private buildJobAbilityLuaTable(abilityName: string, gear: Record<string, string | null>): string {
    const fieldLines = LUA_SLOT_FIELDS
      .filter(({ key }) => !!gear[key])
      .map(({ key, field }) => `        ${field} = '${this.escapeLuaString(gear[key]!)}',`);
    return [`    ${this.jobAbilityLabel(abilityName, this.selectedSubjob)} = {`, ...fieldLines, `    },`].join('\n');
  }

  private jobAbilityLabel(abilityName: string, subjob: string | null): string {
    const base = abilityName.replace(/\s+/g, '');
    return subjob ? `${base}_${subjob}` : base;
  }

  private emptyJobAbilityWrapper(abilityName: string): string {
    return `    ${this.jobAbilityLabel(abilityName, this.selectedSubjob)} = {\n    },`;
  }

  private buildSpellLuaTable(spellName: string, gear: Record<string, string | null>): string {
    const fieldLines = LUA_SLOT_FIELDS
      .filter(({ key }) => !!gear[key])
      .map(({ key, field }) => `        ${field} = '${this.escapeLuaString(gear[key]!)}',`);
    return [`    ${this.spellLabel(spellName, this.selectedSubjob)} = {`, ...fieldLines, `    },`].join('\n');
  }

  private spellLabel(spellName: string, subjob: string | null): string {
    const base = spellName.replace(/\s+/g, '');
    return subjob ? `${base}_${subjob}` : base;
  }

  private emptySpellWrapper(spellName: string): string {
    return `    ${this.spellLabel(spellName, this.selectedSubjob)} = {\n    },`;
  }

  private buildPetLuaTable(abilityName: string, gear: Record<string, string | null>): string {
    const fieldLines = LUA_SLOT_FIELDS
      .filter(({ key }) => !!gear[key])
      .map(({ key, field }) => `        ${field} = '${this.escapeLuaString(gear[key]!)}',`);
    return [`    ${this.petLabel(abilityName, this.selectedSubjob)} = {`, ...fieldLines, `    },`].join('\n');
  }

  private petLabel(abilityName: string, subjob: string | null): string {
    const base = abilityName.replace(/\s+/g, '');
    return subjob ? `${base}_${subjob}` : base;
  }

  private emptyPetWrapper(abilityName: string): string {
    return `    ${this.petLabel(abilityName, this.selectedSubjob)} = {\n    },`;
  }

  private parseGearFromLua(lua: string): Record<string, string | null> {
    const gear = emptyGear();
    const fieldToKey = new Map(LUA_SLOT_FIELDS.map(({ key, field }) => [field, key]));
    const lineRegex = /^\s*(\w+)\s*=\s*'((?:[^'\\]|\\.)*)'\s*,?\s*$/;

    for (const rawLine of lua.split('\n')) {
      const match = lineRegex.exec(rawLine);
      if (!match) {
        continue;
      }
      const [, field, rawValue] = match;
      const key = fieldToKey.get(field);
      if (!key) {
        continue;
      }
      gear[key] = rawValue.replace(/\\'/g, "'");
    }

    return gear;
  }

  private matchesPickerStatFilters(item: GearItem): boolean {
    if (this.pickerSelectedStatFilters.size === 0) {
      return true;
    }
    const haystack = `${item.stats} ${item.notes}`.toLowerCase();
    for (const stat of this.pickerSelectedStatFilters) {
      if (haystack.includes(stat.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  private matchesJob(item: GearItem): boolean {
    if (item.allJobs) {
      return true;
    }
    return !!this.selectedJob && item.jobs.includes(this.selectedJob);
  }

  private emptyLuaWrapper(state: GeneralState): string {
    return `    ${this.stateLabel(state, this.selectedSubjob)} = {\n    },`;
  }

  private emptyElementLuaWrapper(element: ElementCategory): string {
    return `        ${this.elementLabel(element, this.selectedSubjob)} = {\n        },`;
  }

  private buildEmptyElementTextRecord(): Record<ElementCategory, string> {
    const record = emptyElementRecord('');
    for (const element of this.elementCategories) {
      record[element] = this.emptyElementLuaWrapper(element);
    }
    return record;
  }

  private buildPrecastMidcastBlock(state: PrecastMidcastState): string | null {
    const lines = this.elementCategories
      .map((element) => this.elementTextByState[state][element])
      .filter((text) => !this.isBlankLuaTable(text));
    if (lines.length === 0) {
      return null;
    }
    return [`    ${state} = {`, ...lines, `    },`].join('\n');
  }

  private elementLabel(element: ElementCategory, subjob: string | null): string {
    const base = `Elemental_${element}`;
    return subjob ? `${base}_${subjob}` : base;
  }

  private combinedTextForDoc(doc: LuaDocument): string {
    const subjob = doc.subjob;
    const general = doc.sections?.general;
    const lines = this.generalStates.map((state) => {
      const entry: LuaStateEntry = general?.[stateKey(state)] ?? emptyLuaStateEntry();
      if (entry.lua?.trim()) {
        return entry.lua;
      }
      return `    ${this.stateLabel(state, subjob)} = {\n    },`;
    });

    const jobAbilities = doc.sections?.jobAbilities ?? [];
    const jobAbilityLines = jobAbilities.map((entry) =>
      entry.lua?.trim() ? entry.lua : `    ${this.jobAbilityLabel(entry.abilityName, subjob)} = {\n    },`
    );

    const spells = doc.sections?.spells ?? [];
    const spellLines = spells.map((entry) =>
      entry.lua?.trim() ? entry.lua : `    ${this.spellLabel(entry.spellName, subjob)} = {\n    },`
    );

    const petAbilities = doc.sections?.petAbilities ?? [];
    const petLines = petAbilities.map((entry) =>
      entry.lua?.trim() ? entry.lua : `    ${this.petLabel(entry.abilityName, subjob)} = {\n    },`
    );

    return [`local ${this.setsLabel(subjob)} = {`, ...lines, ...jobAbilityLines, ...spellLines, ...petLines, '}'].join('\n');
  }

  private buildMacroBookLua(book: string, set: string): string {
    return [
      `    AshitaCore:GetChatManager():QueueCommand(-1, '/macro book ${book}');`,
      `    AshitaCore:GetChatManager():QueueCommand(-1, '/macro set ${set}');`,
    ].join('\n');
  }

  private buildHandleDefaultLua(): string {
    return [
      'profile.HandleDefault = function()',
      '    local player = gData.GetPlayer();',
      '',
      "    if (player.Status == 'Engaged') then",
      this.handleDefaultBranch('Engaged'),
      "    elseif (player.Status == 'Resting') then",
      this.handleDefaultBranch('Resting'),
      '    else',
      this.handleDefaultBranch('Idle'),
      '    end',
      'end',
    ].join('\n');
  }

  private handleDefaultBranch(state: GeneralState): string {
    // Skip subjobs whose set for this specific state is blank, so we fall
    // through to the main class's default instead of equipping nothing.
    const activeSubjobs = this.subjobDocs
      .filter((doc) => !!doc.subjob && !this.isBlankLuaTable(doc.sections?.general?.[stateKey(state)]?.lua))
      .map((doc) => doc.subjob!);

    if (activeSubjobs.length === 0) {
      return `        gFunc.EquipSet(sets.${state});`;
    }

    const lines: string[] = [];
    activeSubjobs.forEach((subjob, index) => {
      const keyword = index === 0 ? 'if' : 'elseif';
      lines.push(`        ${keyword} (player.SubJob == '${subjob}') then`);
      lines.push(`            gFunc.EquipSet(sets_${subjob}.${state}_${subjob});`);
    });
    lines.push('        else');
    lines.push(`            gFunc.EquipSet(sets.${state});`);
    lines.push('        end');
    return lines.join('\n');
  }

  private isBlankLuaTable(lua: string | null | undefined): boolean {
    if (!lua) {
      return true;
    }
    return lua.trim().split('\n').length <= 2;
  }

  private buildHandleWeaponskillLua(): string {
    return [
      'profile.HandleWeaponskill = function()',
      '    gcmelee.DoWS();',
      '    gFunc.EquipSet(sets.WeaponSkill);',
      'end',
    ].join('\n');
  }

  private buildHandleAbilityLua(): string | null {
    const branches = [
      ...this.jobAbilityEntries.map((entry) => ({
        name: entry.abilityName,
        label: this.jobAbilityLabel(entry.abilityName, null),
      })),
      ...this.petEntries.map((entry) => ({
        name: entry.abilityName,
        label: this.petLabel(entry.abilityName, null),
      })),
    ];

    if (branches.length === 0) {
      return null;
    }

    const lines: string[] = [];
    branches.forEach((branch, index) => {
      const keyword = index === 0 ? 'if' : 'elseif';
      lines.push(`    ${keyword} (action.Name == '${this.escapeLuaString(branch.name)}') then`);
      lines.push(`        gFunc.EquipSet(sets.${branch.label});`);
    });
    lines.push('    end');

    return [
      'profile.HandleAbility = function()',
      '    local action = gData.GetAction();',
      '',
      ...lines,
      'end',
    ].join('\n');
  }

  private buildOnLoadLua(): string {
    const onLoadLines = ['    gSettings.AllowAddSet = true;'];
    if (this.macroBookText.trim()) {
      onLoadLines.push(this.macroBookText);
    }

    return ['profile.OnLoad = function()', ...onLoadLines, 'end'].join('\n');
  }

  private buildProfileClosingLua(): string {
    return [
      'profile.Sets = sets;',
      'profile.Packer = { };',
      '',
      'profile.OnUnload = function() end',
      'return profile;',
    ].join('\n');
  }

  private buildHandlePrecastLua(): string | null {
    const body = this.buildElementDispatchBody('PreCast');
    if (!body) {
      return null;
    }
    return ['profile.HandlePrecast = function(spell)', '    local action = gData.GetAction();', '', ...body, 'end'].join('\n');
  }

  private buildHandleMidcastLua(): string | null {
    const elementBody = this.buildElementDispatchBody('MidCast');
    const spellBody = this.buildSpellDispatchBody();

    if (!elementBody && !spellBody) {
      return null;
    }

    const body = [...(elementBody ?? []), ...(spellBody ?? [])];
    return ['profile.HandleMidcast = function()', '    local action = gData.GetAction();', '', ...body, 'end'].join('\n');
  }

  private buildSpellDispatchBody(): string[] | null {
    if (this.spellEntries.length === 0) {
      return null;
    }

    const lines: string[] = [];
    this.spellEntries.forEach((entry) => {
      lines.push(`    if string.match(action.Name, '${this.escapeLuaString(entry.spellName)}') then`);
      lines.push(`        gFunc.EquipSet(sets.${this.spellLabel(entry.spellName, null)});`);
      lines.push('    end');
    });
    return lines;
  }

  private buildElementDispatchBody(state: PrecastMidcastState): string[] | null {
    const namedElements: ElementCategory[] = ['Fire', 'Earth', 'Water', 'Wind', 'Ice', 'Light', 'Dark'];
    const activeElements = namedElements.filter((element) => !this.isBlankLuaTable(this.elementTextByState[state][element]));
    const hasGeneral = !this.isBlankLuaTable(this.elementTextByState[state].General);

    if (activeElements.length === 0 && !hasGeneral) {
      return null;
    }

    if (activeElements.length === 0) {
      return [`    gFunc.EquipSet(sets.${state}.${this.elementLabel('General', null)});`];
    }

    const lines: string[] = [];
    activeElements.forEach((element, index) => {
      const keyword = index === 0 ? 'if' : 'elseif';
      lines.push(`    ${keyword} (action.Element == '${element}') then`);
      lines.push(`        gFunc.EquipSet(sets.${state}.${this.elementLabel(element, null)});`);
    });

    if (hasGeneral) {
      lines.push('    else');
      lines.push(`        gFunc.EquipSet(sets.${state}.${this.elementLabel('General', null)});`);
    }

    lines.push('    end');
    return lines;
  }

  private stateLabel(state: GeneralState, subjob: string | null): string {
    return subjob ? `${state}_${subjob}` : state;
  }

  private setsLabel(subjob: string | null): string {
    return subjob ? `sets_${subjob}` : 'sets';
  }
}
