import { Component, OnInit } from '@angular/core';
import { JobAddEvent, JobItemEvent } from '../../shared/job-sidebar/job-sidebar.component';
import {
  DEFAULT_WEAPON_TYPE_BY_JOB,
  EquipmentSet,
  EquipmentSetService,
  GEAR_SLOTS,
  GearSlot,
  emptyGear,
} from '../../shared/equipment-set.service';
import { GearItem, GearService, normalizeItemKey } from '../../shared/gear.service';
import { ToastService } from '../../shared/toast.service';
import { SessionService } from '../../shared/session.service';
import { PageStateService } from '../../shared/page-state.service';

const PAGE_KEY = 'equipmentSets';

@Component({
  selector: 'app-equipment-sets',
  templateUrl: './equipment-sets.component.html',
  styleUrls: ['./equipment-sets.component.scss']
})
export class EquipmentSetsComponent implements OnInit {
  gearSlots = GEAR_SLOTS;

  selectedJob: string | null = null;
  selectedSetName: string | null = null;
  nameInput = '';
  gear = emptyGear();

  savedSets: Record<string, string[]> = {};

  activeSlot: GearSlot | null = null;
  gearOptions: GearItem[] = [];
  searchText = '';
  maxLevel: number | null = null;
  selectedWeaponType = '';
  showDetails = true;

  statFilterSections: { section: string; options: string[] }[] = [];
  selectedStatFilters = new Set<string>();
  showFilterModal = false;

  signedIn = false;
  ownedOnly = true;
  ownedItemKeys = new Set<string>();

  constructor(
    private equipmentSetService: EquipmentSetService,
    private gearService: GearService,
    private toastService: ToastService,
    private sessionService: SessionService,
    private pageStateService: PageStateService,
  ) {}

  ngOnInit(): void {
    this.loadSavedSets();
    this.gearService.getStatFilterOptions().subscribe((data) => {
      this.statFilterSections = Object.entries(data).map(([section, options]) => ({ section, options }));
    });

    this.sessionService.session$.subscribe((session) => {
      this.signedIn = session.signedIn;
      if (session.signedIn) {
        this.gearService.getOwnedItemKeys().subscribe((keys) => {
          this.ownedItemKeys = new Set(keys);
        });
      } else {
        this.ownedItemKeys = new Set();
      }
    });

    this.restoreLastSelection();
  }

  private restoreLastSelection(): void {
    const last = this.pageStateService.get(PAGE_KEY);
    if (!last.job) {
      return;
    }
    if (last.name) {
      this.onSelectExisting({ job: last.job, name: last.name });
    } else {
      this.onAdd({ job: last.job });
    }
  }

  loadSavedSets(): void {
    this.equipmentSetService.list().subscribe((sets) => {
      const grouped: Record<string, string[]> = {};
      for (const set of sets) {
        (grouped[set.job] ??= []).push(set.name);
      }
      this.savedSets = grouped;
    });
  }

  onAdd(event: JobAddEvent): void {
    this.selectedJob = event.job;
    this.selectedSetName = null;
    this.nameInput = '';
    this.gear = emptyGear();
    this.selectedStatFilters.clear();
    this.closeGearPicker();
    this.pageStateService.set(PAGE_KEY, { job: event.job, name: null });
  }

  onSelectExisting(event: JobItemEvent): void {
    this.selectedJob = event.job;
    this.selectedSetName = event.name;
    this.selectedStatFilters.clear();
    this.closeGearPicker();
    this.pageStateService.set(PAGE_KEY, { job: event.job, name: event.name });
    this.equipmentSetService.get(event.job, event.name).subscribe((set) => {
      this.nameInput = set.name;
      this.gear = { ...emptyGear(), ...set.gear };
    });
  }

  save(): void {
    const job = this.selectedJob;
    const name = this.nameInput.trim();
    if (!job || !name) {
      return;
    }

    const originalName = this.selectedSetName;
    const set: EquipmentSet = { job, name, gear: this.gear };
    this.equipmentSetService.save(set, originalName).subscribe(() => {
      this.selectedSetName = name;
      this.pageStateService.set(PAGE_KEY, { job, name });
      this.loadSavedSets();
      this.toastService.show('Saved');
    });
  }

  delete(): void {
    const job = this.selectedJob;
    const name = this.selectedSetName;
    if (!job || !name) {
      return;
    }

    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      return;
    }

    this.equipmentSetService.delete(job, name).subscribe(() => {
      this.selectedJob = null;
      this.selectedSetName = null;
      this.nameInput = '';
      this.gear = emptyGear();
      this.closeGearPicker();
      this.pageStateService.clear(PAGE_KEY);
      this.loadSavedSets();
    });
  }

  onSlotClick(slot: GearSlot): void {
    this.activeSlot = slot;
    this.searchText = '';
    this.maxLevel = null;
    this.selectedWeaponType = slot.key === 'main'
      ? (DEFAULT_WEAPON_TYPE_BY_JOB[this.selectedJob ?? ''] ?? '')
      : '';
    this.ownedOnly = true;
    this.gearOptions = [];
    this.gearService.getGearForSlot(slot.key, this.selectedJob).subscribe((items) => {
      this.gearOptions = items;
    });
  }

  closeGearPicker(): void {
    this.activeSlot = null;
    this.gearOptions = [];
  }

  selectGear(item: GearItem): void {
    if (!this.activeSlot) {
      return;
    }
    this.gear[this.activeSlot.key] = item.name;
    this.closeGearPicker();
  }

  removeGear(slot: GearSlot, event: Event): void {
    event.stopPropagation();
    this.gear[slot.key] = null;
  }

  filteredGear(): GearItem[] {
    const search = this.searchText.trim().toLowerCase();
    return this.gearOptions
      .filter((item) => {
        if (!this.matchesJob(item)) {
          return false;
        }
        if (search && !item.name.toLowerCase().includes(search)) {
          return false;
        }
        if (this.maxLevel != null && item.level > this.maxLevel) {
          return false;
        }
        if (this.selectedWeaponType && item.weaponType !== this.selectedWeaponType) {
          return false;
        }
        if (!this.matchesStatFilters(item)) {
          return false;
        }
        if (this.signedIn && this.ownedOnly && !this.ownedItemKeys.has(normalizeItemKey(item.name))) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
  }

  openFilterModal(): void {
    this.showFilterModal = true;
  }

  closeFilterModal(): void {
    this.showFilterModal = false;
  }

  toggleStatFilter(stat: string): void {
    if (this.selectedStatFilters.has(stat)) {
      this.selectedStatFilters.delete(stat);
    } else {
      this.selectedStatFilters.add(stat);
    }
  }

  clearStatFilters(): void {
    this.selectedStatFilters.clear();
  }

  private matchesStatFilters(item: GearItem): boolean {
    if (this.selectedStatFilters.size === 0) {
      return true;
    }
    const haystack = `${item.stats} ${item.notes}`.toLowerCase();
    for (const stat of this.selectedStatFilters) {
      if (haystack.includes(stat.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  availableWeaponTypes(): string[] {
    const types = new Set<string>();
    for (const item of this.gearOptions) {
      if (item.weaponType) {
        types.add(item.weaponType);
      }
    }
    return Array.from(types).sort();
  }

  private matchesJob(item: GearItem): boolean {
    if (item.allJobs) {
      return true;
    }
    return !!this.selectedJob && item.jobs.includes(this.selectedJob);
  }
}
