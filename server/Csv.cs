using System.Text;

// A minimal RFC4180-style CSV parser that operates on the whole file content
// (not line-by-line), so quoted fields containing embedded newlines parse
// correctly as a single field instead of being split into separate rows.
public static class Csv
{
    public static List<List<string>> ParseRecords(string content)
    {
        var records = new List<List<string>>();
        var fields = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;
        var i = 0;
        var n = content.Length;

        void EndField()
        {
            fields.Add(current.ToString());
            current.Clear();
        }

        void EndRecord()
        {
            EndField();
            if (fields.Count > 1 || fields[0].Length > 0)
            {
                records.Add(fields);
            }
            fields = new List<string>();
        }

        while (i < n)
        {
            var c = content[i];

            if (inQuotes)
            {
                if (c == '"')
                {
                    if (i + 1 < n && content[i + 1] == '"')
                    {
                        current.Append('"');
                        i += 2;
                        continue;
                    }
                    inQuotes = false;
                    i++;
                    continue;
                }

                current.Append(c);
                i++;
                continue;
            }

            switch (c)
            {
                case '"':
                    inQuotes = true;
                    i++;
                    break;
                case ',':
                    EndField();
                    i++;
                    break;
                case '\r':
                    i++;
                    if (i < n && content[i] == '\n')
                    {
                        i++;
                    }
                    EndRecord();
                    break;
                case '\n':
                    i++;
                    EndRecord();
                    break;
                default:
                    current.Append(c);
                    i++;
                    break;
            }
        }

        if (current.Length > 0 || fields.Count > 0)
        {
            EndRecord();
        }

        return records;
    }
}
