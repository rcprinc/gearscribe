using System.Text.Json;

public record SetupStatus(bool Completed);

public static class SetupEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    public static void MapSetupEndpoints(this WebApplication app, string dataDir)
    {
        var path = Path.Combine(dataDir, "Settings", "setup.json");

        app.MapGet("/api/settings/setup-status", () =>
        {
            if (!File.Exists(path))
            {
                return Results.Ok(new SetupStatus(false));
            }

            var status = JsonSerializer.Deserialize<SetupStatus>(File.ReadAllText(path), JsonOptions)
                ?? new SetupStatus(false);
            return Results.Ok(status);
        });

        app.MapPost("/api/settings/setup-status", () =>
        {
            var dir = Path.GetDirectoryName(path)!;
            Directory.CreateDirectory(dir);
            File.WriteAllText(path, JsonSerializer.Serialize(new SetupStatus(true), JsonOptions));
            return Results.Ok();
        });
    }
}
