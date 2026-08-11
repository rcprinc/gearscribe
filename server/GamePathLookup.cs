using System.Text.Json;

public static class GamePathLookup
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    public static string Load(string settingsDir)
    {
        var path = Path.Combine(settingsDir, "gamePath.json");
        if (!File.Exists(path))
        {
            return GamePathDefaults.Path;
        }

        var settings = JsonSerializer.Deserialize<GamePathSettings>(File.ReadAllText(path), JsonOptions);
        return settings?.Path ?? GamePathDefaults.Path;
    }
}
