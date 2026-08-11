using System.Text.Json;

public static class SessionEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    public static void MapSessionEndpoints(this WebApplication app, string dataDir)
    {
        var sessionPath = Path.Combine(dataDir, "Settings", "session.json");
        var authPath = Path.Combine(dataDir, "Settings", "auth.json");

        app.MapGet("/api/settings/session", () =>
        {
            if (!File.Exists(sessionPath))
            {
                return Results.Ok(new CharacterSession(false, "ok", null, new Dictionary<string, int>()));
            }

            var session = JsonSerializer.Deserialize<CharacterSession>(File.ReadAllText(sessionPath), JsonOptions)
                ?? new CharacterSession(false, "ok", null, new Dictionary<string, int>());
            return Results.Ok(session);
        });

        app.MapPost("/api/settings/session", (CharacterSession session) =>
        {
            var dir = Path.GetDirectoryName(sessionPath)!;
            Directory.CreateDirectory(dir);
            File.WriteAllText(sessionPath, JsonSerializer.Serialize(session, JsonOptions));
            return Results.Ok();
        });

        app.MapPost("/api/settings/logout", () =>
        {
            if (File.Exists(sessionPath))
            {
                File.Delete(sessionPath);
            }

            if (File.Exists(authPath))
            {
                File.Delete(authPath);
            }

            return Results.Ok();
        });
    }
}
