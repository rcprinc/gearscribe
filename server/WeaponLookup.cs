public static class WeaponLookup
{
    // Only these weapon types can go in Sub, and only these can go in Ranged
    // - a physical slot constraint, independent of what the job can actually
    // use skill-wise. Job compatibility itself is filtered client-side per
    // item (GearItem.Jobs), same as every other equipment slot.
    private static readonly HashSet<string> SubEligibleTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "Axe", "Club", "Dagger", "Katana", "Sword",
    };

    private static readonly HashSet<string> RangedEligibleTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "Archery", "Marksmanship", "Throwing",
    };

    private static readonly string[] AllWeaponTypes =
    {
        "Hand-to-Hand", "Dagger", "Sword", "Great Sword", "Axe", "Great Axe",
        "Scythe", "Polearm", "Staff", "Club", "Katana", "Great Katana",
        "Archery", "Marksmanship", "Throwing",
    };

    // These weapon types are spelled one way in the app, but the CSV file on
    // disk uses a different name - fall back to the alias if the properly
    // spelled file doesn't exist.
    private static readonly Dictionary<string, string> FileNameAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Marksmanship"] = "Marksmenship",
        ["Staff"] = "Stave",
    };

    public static List<GearItem> GetWeaponsForJob(string dataDir, string? job, string slot)
    {
        var items = new List<GearItem>();

        if (string.IsNullOrWhiteSpace(job))
        {
            return items;
        }

        var weaponTypes = FilterForSlot(AllWeaponTypes, slot);

        foreach (var weaponType in weaponTypes)
        {
            var path = ResolveWeaponCsvPath(dataDir, weaponType);
            if (path is null)
            {
                continue;
            }

            items.AddRange(WeaponCsv.Read(path, weaponType));
        }

        return items;
    }

    private static IEnumerable<string> FilterForSlot(string[] weaponTypes, string slot)
    {
        if (string.Equals(slot, "sub", StringComparison.OrdinalIgnoreCase))
        {
            return weaponTypes.Where(SubEligibleTypes.Contains);
        }

        if (string.Equals(slot, "ranged", StringComparison.OrdinalIgnoreCase))
        {
            return weaponTypes.Where(RangedEligibleTypes.Contains);
        }

        return weaponTypes;
    }

    private static string? ResolveWeaponCsvPath(string dataDir, string weaponType)
    {
        var exactPath = Path.Combine(dataDir, $"{weaponType}.csv");
        if (File.Exists(exactPath))
        {
            return exactPath;
        }

        if (FileNameAliases.TryGetValue(weaponType, out var alias))
        {
            var aliasPath = Path.Combine(dataDir, $"{alias}.csv");
            if (File.Exists(aliasPath))
            {
                return aliasPath;
            }
        }

        return null;
    }
}
