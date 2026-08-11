// Stats.csv is laid out with one section per column (e.g. "Weapon Skills",
// "Magic Skills", "Def Skills", "Stats"), with a ragged number of values per
// section, rather than the usual one-row-per-item layout.
public static class StatFilterOptions
{
    public static Dictionary<string, List<string>> Read(string dataDir)
    {
        var result = new Dictionary<string, List<string>>();

        var path = Path.Combine(dataDir, "Stats.csv");
        if (!File.Exists(path))
        {
            return result;
        }

        var records = Csv.ParseRecords(File.ReadAllText(path));
        if (records.Count == 0)
        {
            return result;
        }

        var headers = records[0];
        foreach (var header in headers)
        {
            var section = header.Trim();
            if (section.Length > 0)
            {
                result[section] = new List<string>();
            }
        }

        for (var i = 1; i < records.Count; i++)
        {
            var row = records[i];
            for (var col = 0; col < headers.Count && col < row.Count; col++)
            {
                var section = headers[col].Trim();
                var value = row[col].Trim();
                if (section.Length > 0 && value.Length > 0)
                {
                    result[section].Add(value);
                }
            }
        }

        return result;
    }
}
