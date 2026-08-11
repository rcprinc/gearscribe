using System.Globalization;

// Weapon CSVs use a different column layout than armor CSVs:
// Name, Level, Damage, Delay, DPS, Description, Jobs (some files have
// trailing empty columns beyond Jobs, which are ignored).
public static class WeaponCsv
{
    public static List<GearItem> Read(string path, string weaponType)
    {
        var records = Csv.ParseRecords(File.ReadAllText(path));
        var items = new List<GearItem>();

        for (var i = 1; i < records.Count; i++)
        {
            var fields = records[i];
            if (fields.Count < 7)
            {
                continue;
            }

            var name = fields[0].Trim();
            if (name.Length == 0)
            {
                continue;
            }

            _ = int.TryParse(fields[1].Trim(), out var level);
            _ = int.TryParse(fields[2].Trim(), out var damage);
            _ = int.TryParse(fields[3].Trim(), out var delay);
            _ = double.TryParse(fields[4].Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out var dps);
            var description = fields[5].Trim();
            var (jobs, allJobs) = GearCsv.ParseJobs(fields[6]);

            var stats = $"DMG:{damage} Delay:{delay} DPS:{dps.ToString("0.00", CultureInfo.InvariantCulture)} ({weaponType})";

            items.Add(new GearItem(name, level, jobs, allJobs, stats, description, weaponType));
        }

        return items;
    }
}
