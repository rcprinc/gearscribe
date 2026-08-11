public static class GameScriptExporter
{
    public static void Export(string scriptsDir, string job, string name, List<MacroLine> lines)
    {
        try
        {
            Directory.CreateDirectory(scriptsDir);
            var path = Path.Combine(scriptsDir, $"{job}-{name}.txt");
            var content = string.Join(Environment.NewLine, lines.Select(FormatLine));
            File.WriteAllText(path, content);
        }
        catch
        {
            // Game folder may be unavailable on this machine; never block the primary save.
        }
    }

    public static void Delete(string scriptsDir, string job, string name)
    {
        try
        {
            var path = Path.Combine(scriptsDir, $"{job}-{name}.txt");
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch
        {
        }
    }

    private static string FormatLine(MacroLine line)
    {
        var text = line.Text ?? string.Empty;
        return string.IsNullOrWhiteSpace(line.Wait) ? text : $"{text} <wait {line.Wait}>";
    }
}
