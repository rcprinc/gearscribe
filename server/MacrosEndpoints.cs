using System.Text.Json;

public static class MacrosEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    public static void MapMacrosEndpoints(this WebApplication app, string dataDir, string settingsDir)
    {
        app.MapGet("/api/macros", () =>
        {
            if (!Directory.Exists(dataDir))
            {
                return Results.Ok(Array.Empty<Macro>());
            }

            var macros = Directory.GetFiles(dataDir, "*.json")
                .Select(path => JsonSerializer.Deserialize<Macro>(File.ReadAllText(path), JsonOptions))
                .Where(macro => macro is not null)
                .ToArray();

            return Results.Ok(macros);
        });

        app.MapGet("/api/macros/{job}/{name}", (string job, string name) =>
        {
            var path = TryGetMacroPath(dataDir, job, name);
            if (path is null || !File.Exists(path))
            {
                return Results.NotFound();
            }

            var macro = JsonSerializer.Deserialize<Macro>(File.ReadAllText(path), JsonOptions);
            return Results.Ok(macro);
        });

        app.MapPost("/api/macros", (SaveMacroRequest request) =>
        {
            var job = Sanitize(request.Job);
            var name = Sanitize(request.Name);

            if (job.Length == 0 || name.Length == 0)
            {
                return Results.BadRequest("Job and name are required.");
            }

            Directory.CreateDirectory(dataDir);
            var newPath = Path.Combine(dataDir, $"{job}-{name}.json");
            var macro = new Macro(job, name, request.Lines);
            File.WriteAllText(newPath, JsonSerializer.Serialize(macro, JsonOptions));
            var scriptsDir = Path.Combine(GamePathLookup.Load(settingsDir), "scripts");
            GameScriptExporter.Export(scriptsDir, job, name, request.Lines);

            if (!string.IsNullOrWhiteSpace(request.OriginalName))
            {
                var originalName = Sanitize(request.OriginalName);
                if (originalName.Length > 0)
                {
                    var oldPath = Path.Combine(dataDir, $"{job}-{originalName}.json");
                    if (!string.Equals(oldPath, newPath, StringComparison.OrdinalIgnoreCase) && File.Exists(oldPath))
                    {
                        File.Delete(oldPath);
                        GameScriptExporter.Delete(scriptsDir, job, originalName);
                    }
                }
            }

            return Results.Ok();
        });

        app.MapDelete("/api/macros/{job}/{name}", (string job, string name) =>
        {
            var path = TryGetMacroPath(dataDir, job, name);
            if (path is null || !File.Exists(path))
            {
                return Results.NotFound();
            }

            File.Delete(path);
            var scriptsDir = Path.Combine(GamePathLookup.Load(settingsDir), "scripts");
            GameScriptExporter.Delete(scriptsDir, job, name);
            return Results.Ok();
        });
    }

    private static string? TryGetMacroPath(string dataDir, string job, string name)
    {
        var sanitizedJob = Sanitize(job);
        var sanitizedName = Sanitize(name);
        if (sanitizedJob.Length == 0 || sanitizedName.Length == 0)
        {
            return null;
        }

        return Path.Combine(dataDir, $"{sanitizedJob}-{sanitizedName}.json");
    }

    private static string Sanitize(string value) =>
        new string(value.Where(c => char.IsLetterOrDigit(c) || c is '_' or '-' or ' ').ToArray()).Trim();
}
