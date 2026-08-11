import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastService } from './shared/toast.service';
import { SessionService } from './shared/session.service';
import { JobSidebarPreferencesService } from './shared/job-sidebar-preferences.service';
import { GamePathService } from './shared/game-path.service';
import { InventoryService } from './shared/inventory.service';
import { SetupStatusService } from './shared/setup-status.service';

const SETUP_TABS = ['Game File Path', 'Setup Profile', 'Setup Inventory'] as const;
type SetupTab = typeof SETUP_TABS[number];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'client';
  toastMessage: string | null = null;

  session$ = this.sessionService.session$;

  readonly setupTabs = SETUP_TABS;
  setupWizardOpen = false;
  setupTab: SetupTab = 'Game File Path';
  setupGamePath = '';
  setupUsername = '';
  setupProfileRaw = '';
  setupInventoryRaw = '';

  private toastTimeout?: ReturnType<typeof setTimeout>;
  private toastSubscription?: Subscription;

  constructor(
    private toastService: ToastService,
    private sessionService: SessionService,
    private jobSidebarPreferencesService: JobSidebarPreferencesService,
    private gamePathService: GamePathService,
    private inventoryService: InventoryService,
    private setupStatusService: SetupStatusService,
  ) {}

  ngOnInit(): void {
    this.sessionService.load();
    this.jobSidebarPreferencesService.load();

    this.gamePathService.get().subscribe((settings) => {
      this.setupGamePath = settings.path;
    });

    this.setupStatusService.get().subscribe((status) => {
      if (!status.completed) {
        this.setupWizardOpen = true;
      }
    });

    this.toastSubscription = this.toastService.message$.subscribe((message) => {
      this.toastMessage = message;
      clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => {
        this.toastMessage = null;
      }, 2200);
    });
  }

  ngOnDestroy(): void {
    this.toastSubscription?.unsubscribe();
    clearTimeout(this.toastTimeout);
  }

  selectSetupTab(tab: SetupTab): void {
    this.setupTab = tab;
  }

  saveGamePathAndAdvance(): void {
    const path = this.setupGamePath.trim();
    if (path) {
      this.gamePathService.save(path).subscribe(() => {
        this.gamePathService.get().subscribe((settings) => {
          this.setupGamePath = settings.path;
        });
      });
    }
    this.setupTab = 'Setup Profile';
  }

  saveProfileAndAdvance(): void {
    const raw = this.setupProfileRaw.trim();
    if (!raw) {
      this.setupTab = 'Setup Inventory';
      return;
    }

    try {
      this.sessionService.loginWithResponse(raw).subscribe(() => {
        this.setupTab = 'Setup Inventory';
      });
    } catch {
      this.toastService.show("That doesn't look like valid JSON");
    }
  }

  saveInventoryAndFinish(): void {
    const raw = this.setupInventoryRaw.trim();
    if (!raw) {
      this.finishSetup('Setup complete');
      return;
    }

    this.inventoryService.save(raw).subscribe({
      next: () => this.finishSetup('Setup complete'),
      error: () => this.toastService.show("That doesn't look like valid JSON"),
    });
  }

  skipSetup(): void {
    if (!window.confirm(
      "Skip setup? You won't be able to automate Equipment Sets or Luas until it's completed. " +
      'You can always finish this later from Settings.\n\n' +
      'Click OK to continue anyway, or Cancel to go back.'
    )) {
      return;
    }

    this.finishSetup(null);
  }

  private finishSetup(toastMessage: string | null): void {
    this.setupStatusService.markComplete().subscribe(() => {
      this.setupWizardOpen = false;
      if (toastMessage) {
        this.toastService.show(toastMessage);
      }
    });
  }
}
