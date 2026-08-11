import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MacrosComponent } from './pages/macros/macros.component';
import { LuasComponent } from './pages/luas/luas.component';
import { EquipmentSetsComponent } from './pages/equipment-sets/equipment-sets.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { JobSidebarComponent } from './shared/job-sidebar/job-sidebar.component';

@NgModule({
  declarations: [
    AppComponent,
    MacrosComponent,
    LuasComponent,
    EquipmentSetsComponent,
    SettingsComponent,
    JobSidebarComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
