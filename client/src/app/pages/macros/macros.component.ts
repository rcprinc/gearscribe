import { Component, OnInit } from '@angular/core';
import { JobAddEvent, JobItemEvent } from '../../shared/job-sidebar/job-sidebar.component';
import { Macro, MacroLine, MacroService, defaultMacroLines } from '../../shared/macro.service';
import { ToastService } from '../../shared/toast.service';
import { PageStateService } from '../../shared/page-state.service';

const PAGE_KEY = 'macros';

@Component({
  selector: 'app-macros',
  templateUrl: './macros.component.html',
  styleUrls: ['./macros.component.scss']
})
export class MacrosComponent implements OnInit {
  selectedJob: string | null = null;
  selectedMacroName: string | null = null;
  nameInput = '';
  lines: MacroLine[] = defaultMacroLines();

  savedMacros: Record<string, string[]> = {};

  readonly prefillOptions = ['Equip', 'Job Ability', 'Magic', 'Weapon Skill', 'Pet', 'Ranged', 'Target'];

  constructor(
    private macroService: MacroService,
    private toastService: ToastService,
    private pageStateService: PageStateService,
  ) {}

  ngOnInit(): void {
    this.loadSavedMacros();
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

  loadSavedMacros(): void {
    this.macroService.list().subscribe((macros) => {
      const grouped: Record<string, string[]> = {};
      for (const macro of macros) {
        (grouped[macro.job] ??= []).push(macro.name);
      }
      this.savedMacros = grouped;
    });
  }

  onAdd(event: JobAddEvent): void {
    this.selectedJob = event.job;
    this.selectedMacroName = null;
    this.nameInput = '';
    this.lines = defaultMacroLines();
    this.pageStateService.set(PAGE_KEY, { job: event.job, name: null });
  }

  onSelectExisting(event: JobItemEvent): void {
    this.selectedJob = event.job;
    this.selectedMacroName = event.name;
    this.pageStateService.set(PAGE_KEY, { job: event.job, name: event.name });
    this.macroService.get(event.job, event.name).subscribe((macro) => {
      this.nameInput = macro.name;
      this.lines = macro.lines?.length ? macro.lines : defaultMacroLines();
    });
  }

  addLine(): void {
    this.lines.push({ text: '', wait: '' });
  }

  removeLine(index: number): void {
    this.lines.splice(index, 1);
  }

  save(): void {
    const job = this.selectedJob;
    const name = this.nameInput.trim();
    if (!job || !name) {
      return;
    }

    const originalName = this.selectedMacroName;
    const macro: Macro = { job, name, lines: this.lines };
    this.macroService.save(macro, originalName).subscribe(() => {
      this.selectedMacroName = name;
      this.pageStateService.set(PAGE_KEY, { job, name });
      this.loadSavedMacros();
      this.toastService.show('Saved');
    });
  }

  delete(): void {
    const job = this.selectedJob;
    const name = this.selectedMacroName;
    if (!job || !name) {
      return;
    }

    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      return;
    }

    this.macroService.delete(job, name).subscribe(() => {
      this.selectedJob = null;
      this.selectedMacroName = null;
      this.nameInput = '';
      this.pageStateService.clear(PAGE_KEY);
      this.loadSavedMacros();
    });
  }
}
