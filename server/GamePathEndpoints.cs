using System.Text.Json;

public static class GamePathEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    public static void MapGamePathEndpoints(this WebApplication app, string dataDir)
    {
        var path = Path.Combine(dataDir, "Settings", "gamePath.json");

        app.MapGet("/api/settings/game-path", () =>
        {
            if (!File.Exists(path))
            {
                return Results.Ok(new GamePathSettings(GamePathDefaults.Path));
            }

            var settings = JsonSerializer.Deserialize<GamePathSettings>(File.ReadAllText(path), JsonOptions)
                ?? new GamePathSettings(GamePathDefaults.Path);
            return Results.Ok(settings);
        });

        app.MapPost("/api/settings/game-path", (GamePathSettings settings) =>
        {
            var dir = Path.GetDirectoryName(path)!;
            Directory.CreateDirectory(dir);
            var normalized = new GamePathSettings(NormalizePath(settings.Path));
            File.WriteAllText(path, JsonSerializer.Serialize(normalized, JsonOptions));
            return Results.Ok();
        });
    }

    // The launcher's "Open Folder" button for Addons opens the Addons folder itself,
    // so users copying that path end up one level too deep. Strip a trailing "addons"
    // segment so the game path still points at the actual game root.
    private static string NormalizePath(string value)
    {
        var trimmed = value.TrimEnd('\\', '/');
        if (trimmed.Length == 0)
        {
            return value;
        }

        var lastSegment = Path.GetFileName(trimmed);
        if (!string.Equals(lastSegment, "addons", StringComparison.OrdinalIgnoreCase))
        {
            return value;
        }

        var parent = Path.GetDirectoryName(trimmed);
        if (string.IsNullOrEmpty(parent))
        {
            return value;
        }

        return parent.EndsWith('\\') || parent.EndsWith('/') ? parent : parent + "\\";
    }
}
