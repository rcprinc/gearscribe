using System.Text.Json;

public record InventoryPasteRequest(string Raw);

// Backed by Data/Settings/inventory.json - populated via the "+ Add Inventory"
// paste flow in Settings, holding the single character's inventory response.
public static class InventoryEndpoints
{
    public static void MapInventoryEndpoints(this WebApplication app, string dataDir)
    {
        var path = Path.Combine(dataDir, "Settings", "inventory.json");

        app.MapGet("/api/settings/inventory/items", () =>
        {
            if (!File.Exists(path))
            {
                return Results.Ok(Array.Empty<string>());
            }

            using var doc = JsonDocument.Parse(File.ReadAllText(path));
            if (!doc.RootElement.TryGetProperty("inventory", out var bags))
            {
                return Results.Ok(Array.Empty<string>());
            }

            var keys = new HashSet<string>();
            foreach (var bag in bags.EnumerateObject())
            {
                foreach (var item in bag.Value.EnumerateArray())
                {
                    if (item.TryGetProperty("name", out var nameProp) && nameProp.ValueKind == JsonValueKind.String)
                    {
                        var key = Normalize(nameProp.GetString() ?? "");
                        if (key.Length > 0)
                        {
                            keys.Add(key);
                        }
                    }
                }
            }

            return Results.Ok(keys.ToArray());
        });

        app.MapPost("/api/settings/inventory", (InventoryPasteRequest request) =>
        {
            try
            {
                using var doc = JsonDocument.Parse(request.Raw);
            }
            catch (JsonException)
            {
                return Results.BadRequest("That doesn't look like valid JSON.");
            }

            var dir = Path.GetDirectoryName(path)!;
            Directory.CreateDirectory(dir);
            File.WriteAllText(path, request.Raw);
            return Results.Ok();
        });
    }

    private static string Normalize(string value) =>
        new string(value.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();
}
