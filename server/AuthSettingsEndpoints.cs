using System.Text.Json;

public static class AuthSettingsEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    public static void MapAuthSettingsEndpoints(this WebApplication app, string dataDir)
    {
        var path = Path.Combine(dataDir, "Settings", "auth.json");

        app.MapGet("/api/settings/auth", () =>
        {
            if (!File.Exists(path))
            {
                return Results.Ok(new AuthSettings("", ""));
            }

            var settings = JsonSerializer.Deserialize<AuthSettings>(File.ReadAllText(path), JsonOptions)
                ?? new AuthSettings("", "");
            return Results.Ok(settings);
        });

        app.MapPost("/api/settings/auth", (AuthSettings settings) =>
        {
            var dir = Path.GetDirectoryName(path)!;
            Directory.CreateDirectory(dir);
            File.WriteAllText(path, JsonSerializer.Serialize(settings, JsonOptions));
            return Results.Ok();
        });
    }
}
