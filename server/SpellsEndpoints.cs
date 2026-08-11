using System.Text.Json;

public static class SpellsEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static void MapSpellsEndpoints(this WebApplication app, string dataDir)
    {
        var path = Path.Combine(dataDir, "JobInfo", "Spells.json.txt");

        app.MapGet("/api/spells", () =>
        {
            if (!File.Exists(path))
            {
                return Results.Ok(new Dictionary<string, string[]>());
            }

            var spells = JsonSerializer.Deserialize<Dictionary<string, string[]>>(File.ReadAllText(path), JsonOptions)
                ?? new Dictionary<string, string[]>();
            return Results.Ok(spells);
        });
    }
}
