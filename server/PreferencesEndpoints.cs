using System.Text.Json;

public static class PreferencesEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    public static void MapPreferencesEndpoints(this WebApplication app, string dataDir)
    {
        var path = Path.Combine(dataDir, "Settings", "preferences.json");

        app.MapGet("/api/settings/preferences", () =>
        {
            if (!File.Exists(path))
            {
                return Results.Ok(new JobSidebarPreferences(Array.Empty<string>(), Array.Empty<string>()));
            }

            var prefs = JsonSerializer.Deserialize<JobSidebarPreferences>(File.ReadAllText(path), JsonOptions)
                ?? new JobSidebarPreferences(Array.Empty<string>(), Array.Empty<string>());
            return Results.Ok(prefs);
        });

        app.MapPost("/api/settings/preferences", (JobSidebarPreferences prefs) =>
        {
            var dir = Path.GetDirectoryName(path)!;
            Directory.CreateDirectory(dir);
            File.WriteAllText(path, JsonSerializer.Serialize(prefs, JsonOptions));
            return Results.Ok();
        });

        app.MapPost("/api/settings/preferences/clear", () =>
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }

            return Results.Ok();
        });
    }
}
