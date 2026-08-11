public static class GearCsv
{
    public static List<GearItem> Read(string path)
    {
        var records = Csv.ParseRecords(File.ReadAllText(path));
        var items = new List<GearItem>();

        if (records.Count == 0)
        {
            return items;
        }

        // Columns aren't always in the same order/position across files -
        // some (e.g. Back.csv, Waist.csv) insert an extra "Slot" column - so
        // look up each field by its header name instead of a fixed index.
        var header = records[0];
        var nameIndex = FindColumn(header, "Name");
        var levelIndex = FindColumn(header, "Level");
        var jobsIndex = FindColumn(header, "Jobs");
        var statsIndex = FindColumn(header, "Stats");
        var notesIndex = FindColumn(header, "Horizon Changes");

        if (nameIndex < 0 || levelIndex < 0 || jobsIndex < 0)
        {
            return items;
        }

        for (var i = 1; i < records.Count; i++)
        {
            var fields = records[i];

            var name = GetField(fields, nameIndex).Trim();
            if (name.Length == 0)
            {
                continue;
            }

            _ = int.TryParse(GetField(fields, levelIndex).Trim(), out var level);
            var (jobs, allJobs) = ParseJobs(GetField(fields, jobsIndex));
            var stats = GetField(fields, statsIndex).Trim();
            var notes = GetField(fields, notesIndex).Trim();

            items.Add(new GearItem(name, level, jobs, allJobs, stats, notes));
        }

        return items;
    }

    // Job codes are normally slash-separated ("WAR / MNK"), but some rows
    // are missing a slash between two codes ("BST BRD"), so also split on
    // whitespace - job codes never contain spaces themselves.
    internal static (string[] Jobs, bool AllJobs) ParseJobs(string raw)
    {
        var trimmed = raw.Trim();
        if (trimmed.Length == 0 || trimmed.Equals("All Jobs", StringComparison.OrdinalIgnoreCase))
        {
            return (Array.Empty<string>(), true);
        }

        var jobs = trimmed
            .Split('/', StringSplitOptions.RemoveEmptyEntries)
            .SelectMany(part => part.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries))
            .Select(job => job.Trim().ToUpperInvariant())
            .Where(job => job.Length > 0)
            .Distinct()
            .ToArray();

        return (jobs, false);
    }

    private static string GetField(List<string> fields, int index) =>
        index >= 0 && index < fields.Count ? fields[index] : "";

    private static int FindColumn(List<string> header, string name)
    {
        for (var i = 0; i < header.Count; i++)
        {
            if (string.Equals(header[i].Trim(), name, StringComparison.OrdinalIgnoreCase))
            {
                return i;
            }
        }

        return -1;
    }
}
