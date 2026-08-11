public static class GearEndpoints
{
    private static readonly HashSet<string> WeaponSlots = new(StringComparer.OrdinalIgnoreCase)
    {
        "main", "sub", "ranged",
    };

    private static readonly Dictionary<string, string> SlotFileMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["ammo"] = "Ammo",
        ["head"] = "Head",
        ["neck"] = "Neck",
        ["ear1"] = "Ear",
        ["ear2"] = "Ear",
        ["body"] = "Body",
        ["hands"] = "Hands",
        ["ring1"] = "Ring",
        ["ring2"] = "Ring",
        ["back"] = "Back",
        ["waist"] = "Waist",
        ["legs"] = "Legs",
        ["feet"] = "Feet",
    };

    public static void MapGearEndpoints(this WebApplication app, string dataDir)
    {
        app.MapGet("/api/gear/{slot}", (string slot, string? job) =>
        {
            if (WeaponSlots.Contains(slot))
            {
                return Results.Ok(WeaponLookup.GetWeaponsForJob(dataDir, job, slot));
            }

            if (!SlotFileMap.TryGetValue(slot, out var baseName))
            {
                return Results.Ok(Array.Empty<GearItem>());
            }

            var path = Path.Combine(dataDir, $"{baseName}.csv");
            if (!File.Exists(path))
            {
                return Results.Ok(Array.Empty<GearItem>());
            }

            return Results.Ok(GearCsv.Read(path));
        });
    }
}
