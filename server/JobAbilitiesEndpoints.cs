using System.Text.Json;

public static class JobAbilitiesEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static void MapJobAbilitiesEndpoints(this WebApplication app, string dataDir)
    {
        var path = Path.Combine(dataDir, "JobInfo", "JobAbilities.json.txt");

        app.MapGet("/api/job-abilities", () =>
        {
            if (!File.Exists(path))
            {
                return Results.Ok(new Dictionary<string, string[]>());
            }

            var abilities = JsonSerializer.Deserialize<Dictionary<string, string[]>>(File.ReadAllText(path), JsonOptions)
                ?? new Dictionary<string, string[]>();
            return Results.Ok(abilities);
        });
    }
}
