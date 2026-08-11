internal static class Program
{
    private const string Url = "http://127.0.0.1:5151";

    [STAThread]
    private static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.WebHost.UseUrls(Url);
        var app = builder.Build();

        app.UseDefaultFiles();
        app.UseStaticFiles();

        app.MapGet("/api/ping", () => Results.Ok(new { message = "pong" }));

        var gameDataDir = Path.GetFullPath(
            Path.Combine(builder.Environment.ContentRootPath, "..", "Data"));

        var settingsDir = Path.Combine(gameDataDir, "Settings");
        var equipmentSetsDataDir = Path.Combine(gameDataDir, "EquipmentSets");
        var inventoryPath = Path.Combine(settingsDir, "inventory.json");
        app.MapEquipmentSetsEndpoints(equipmentSetsDataDir, inventoryPath);
        app.MapGearEndpoints(gameDataDir);

        var macrosDataDir = Path.Combine(gameDataDir, "Macros");
        app.MapMacrosEndpoints(macrosDataDir, settingsDir);
        app.MapGet("/api/stat-filters", () => Results.Ok(StatFilterOptions.Read(gameDataDir)));
        app.MapAuthSettingsEndpoints(gameDataDir);
        app.MapSessionEndpoints(gameDataDir);
        app.MapInventoryEndpoints(gameDataDir);
        app.MapPreferencesEndpoints(gameDataDir);
        app.MapGamePathEndpoints(gameDataDir);

        var luasDataDir = Path.Combine(gameDataDir, "Luas");
        app.MapLuasEndpoints(luasDataDir, settingsDir);
        app.MapJobAbilitiesEndpoints(gameDataDir);
        app.MapSpellsEndpoints(gameDataDir);
        app.MapPetAbilitiesEndpoints(gameDataDir);
        app.MapClearAllEndpoints(gameDataDir);
        app.MapSetupEndpoints(gameDataDir);

        app.StartAsync().GetAwaiter().GetResult();

        ApplicationConfiguration.Initialize();
        Application.Run(new MainForm(Url));

        app.StopAsync().GetAwaiter().GetResult();
    }
}
