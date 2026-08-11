using System.Text.Json;

public static class ClearAllEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static void MapClearAllEndpoints(this WebApplication app, string dataDir)
    {
        app.MapPost("/api/settings/clear-all", () =>
        {
            var settingsDir = Path.Combine(dataDir, "Settings");
            DeleteFileIfExists(Path.Combine(settingsDir, "auth.json"));
            DeleteFileIfExists(Path.Combine(settingsDir, "session.json"));
            DeleteFileIfExists(Path.Combine(settingsDir, "preferences.json"));
            DeleteFileIfExists(Path.Combine(settingsDir, "gamePath.json"));
            DeleteFileIfExists(Path.Combine(settingsDir, "inventory.json"));
            DeleteFileIfExists(Path.Combine(settingsDir, "setup.json"));

            DeleteAllFiles(Path.Combine(dataDir, "EquipmentSets"), "*.json");
            DeleteAllFiles(Path.Combine(dataDir, "Luas"), "*.json");
            DeleteMacros(Path.Combine(dataDir, "Macros"), settingsDir);

            return Results.Ok();
        });
    }

    private static void DeleteMacros(string macrosDir, string settingsDir)
    {
        if (!Directory.Exists(macrosDir))
        {
            return;
        }

        var scriptsDir = Path.Combine(GamePathLookup.Load(settingsDir), "scripts");
        foreach (var path in Directory.GetFiles(macrosDir, "*.json"))
        {
            var macro = TryReadMacro(path);
            if (macro is not null)
            {
                GameScriptExporter.Delete(scriptsDir, macro.Job, macro.Name);
            }

            File.Delete(path);
        }
    }

    private static Macro? TryReadMacro(string path)
    {
        try
        {
            return JsonSerializer.Deserialize<Macro>(File.ReadAllText(path), JsonOptions);
        }
        catch
        {
            return null;
        }
    }

    private static void DeleteFileIfExists(string path)
    {
        if (File.Exists(path))
        {
            File.Delete(path);
        }
    }

    private static void DeleteAllFiles(string dir, string pattern)
    {
        if (!Directory.Exists(dir))
        {
            return;
        }

        foreach (var path in Directory.GetFiles(dir, pattern))
        {
            File.Delete(path);
        }
    }
}
