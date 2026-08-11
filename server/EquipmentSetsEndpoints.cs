using System.Text.Json;

public static class EquipmentSetsEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    public static void MapEquipmentSetsEndpoints(this WebApplication app, string dataDir, string inventoryPath)
    {
        app.MapGet("/api/equipment-sets", () =>
        {
            if (!Directory.Exists(dataDir))
            {
                return Results.Ok(Array.Empty<EquipmentSet>());
            }

            var sets = Directory.GetFiles(dataDir, "*.json")
                .Select(path => JsonSerializer.Deserialize<EquipmentSet>(File.ReadAllText(path), JsonOptions))
                .Where(set => set is not null)
                .ToArray();

            return Results.Ok(sets);
        });

        app.MapGet("/api/equipment-sets/{job}/{name}", (string job, string name) =>
        {
            var path = TryGetSetPath(dataDir, job, name);
            if (path is null || !File.Exists(path))
            {
                return Results.NotFound();
            }

            var set = JsonSerializer.Deserialize<EquipmentSet>(File.ReadAllText(path), JsonOptions);
            return Results.Ok(set);
        });

        app.MapPost("/api/equipment-sets", (SaveEquipmentSetRequest request) =>
        {
            var job = Sanitize(request.Job);
            var name = Sanitize(request.Name);

            if (job.Length == 0 || name.Length == 0)
            {
                return Results.BadRequest("Job and name are required.");
            }

            Directory.CreateDirectory(dataDir);
            var newPath = Path.Combine(dataDir, $"{job}-{name}.json");
            var shortNames = BuildShortNames(inventoryPath, request.Gear);
            var set = new EquipmentSet(job, name, request.Gear, shortNames);
            File.WriteAllText(newPath, JsonSerializer.Serialize(set, JsonOptions));

            if (!string.IsNullOrWhiteSpace(request.OriginalName))
            {
                var originalName = Sanitize(request.OriginalName);
                if (originalName.Length > 0)
                {
                    var oldPath = Path.Combine(dataDir, $"{job}-{originalName}.json");
                    if (!string.Equals(oldPath, newPath, StringComparison.OrdinalIgnoreCase) && File.Exists(oldPath))
                    {
                        File.Delete(oldPath);
                    }
                }
            }

            return Results.Ok();
        });

        app.MapDelete("/api/equipment-sets/{job}/{name}", (string job, string name) =>
        {
            var path = TryGetSetPath(dataDir, job, name);
            if (path is null || !File.Exists(path))
            {
                return Results.NotFound();
            }

            File.Delete(path);
            return Results.Ok();
        });
    }

    private static string? TryGetSetPath(string dataDir, string job, string name)
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

    // Only populated when Data/Settings/inventory.json exists (i.e. the user has
    // added their inventory) - short names come from that response's itemMetadata.
    private static Dictionary<string, string?> BuildShortNames(string inventoryPath, Dictionary<string, string?> gear)
    {
        var result = new Dictionary<string, string?>();
        if (!File.Exists(inventoryPath))
        {
            return result;
        }

        Dictionary<string, string> shortNameByNormalizedFullName;
        try
        {
            shortNameByNormalizedFullName = LoadShortNameLookup(inventoryPath);
        }
        catch (JsonException)
        {
            return result;
        }

        foreach (var (slot, itemName) in gear)
        {
            if (string.IsNullOrWhiteSpace(itemName))
            {
                continue;
            }

            var key = NormalizeName(itemName);
            if (shortNameByNormalizedFullName.TryGetValue(key, out var shortName))
            {
                result[slot] = EscapeApostrophes(shortName);
            }
        }

        return result;
    }

    private static Dictionary<string, string> LoadShortNameLookup(string inventoryPath)
    {
        var lookup = new Dictionary<string, string>();
        using var doc = JsonDocument.Parse(File.ReadAllText(inventoryPath));
        if (!doc.RootElement.TryGetProperty("itemMetadata", out var metadata))
        {
            return lookup;
        }

        foreach (var entry in metadata.EnumerateObject())
        {
            if (!entry.Value.TryGetProperty("name", out var nameProp) || nameProp.ValueKind != JsonValueKind.String)
            {
                continue;
            }
            if (!entry.Value.TryGetProperty("logName", out var logNameProp) || logNameProp.ValueKind != JsonValueKind.String)
            {
                continue;
            }

            var key = NormalizeName(logNameProp.GetString() ?? "");
            if (key.Length == 0)
            {
                continue;
            }

            lookup[key] = nameProp.GetString() ?? "";
        }

        return lookup;
    }

    private static string EscapeApostrophes(string value) => value.Replace("'", "\\'");

    private static string NormalizeName(string value) =>
        new string(value.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();
}
