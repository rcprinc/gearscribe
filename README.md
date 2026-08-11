# Gearscribe

A Windows desktop companion app for the FFXI private server HorizonXI. Gearscribe helps you build and manage Equipment Sets, Macros, and Ashita/LuAshitacast Lua profiles, and can write generated Lua files straight into your game folder.

## Getting Started

1. Go to the [Releases](../../releases) page of this repository.
2. Download the latest `Gearscribe.zip` asset.
3. Extract the zip anywhere on your computer (e.g. your Desktop or Documents folder).
4. Open the extracted `Gearscribe` folder, then the `App` folder inside it, and run `Gearscribe.exe`.
   - No installer, and no separate .NET install needed — everything required to run is bundled in the folder.
   - Windows may show a "Windows protected your PC" SmartScreen prompt the first time, since the app isn't code-signed. Click **More info** → **Run anyway** to continue.
5. On first launch, a **Setup** window will walk you through the steps below. You can skip any of them and finish later from the **Settings** tab.

## Setup Steps

Gearscribe asks for three things up front. None of them are required to use the app, but each one unlocks specific functionality — here's what each is for and what's affected if you skip it.

### Game File Path

**Why it's needed:** Gearscribe needs to know where HorizonXI is installed so it can write generated Lua files directly into your LuAshitacast addon folder, and export macro scripts into your game's `scripts` folder.

**Without it:** The **Update** button on the Luas page (which writes `<Job>.lua` into your LuAshitacast folder) will fail with a "game not installed in the default location" error. Macro exports (the `.txt` files used by `/exec` in-game) also won't be written anywhere useful. Everything else — building Equipment Sets, editing Macros, and building out Luas configs — still works fine; this step only affects pushing those files into the actual game folder.

### Setup Profile

**Why it's needed:** Gearscribe reads your character name and job levels from a real HorizonXI API response. Your character name is used to find your `<Name>_<Number>` folder under LuAshitacast, and your job levels are shown next to each job in the sidebar.

**Without it:** The **Update** button on the Luas page will refuse to run with a "we don't currently have your username" error, even if your Game File Path is set correctly. The job sidebar will also show no levels next to your jobs.

### Setup Inventory

**Why it's needed:** Gearscribe reads your character's inventory to know which items you actually own, and to capture their short in-game display names (e.g. "Scp. Harness +1" instead of "Scorpion Harness +1") for use in generated Lua.

**Without it:** The "Owned gear" filter in the gear picker (Equipment Sets and Luas' Manually Select Gear) won't be available, so item lists show everything regardless of what you own. Generated Lua will also use full item names instead of their shorter in-game equivalents.
