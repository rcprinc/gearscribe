public record MacroLine(string Text, string Wait);

public record Macro(string Job, string Name, List<MacroLine> Lines);

public record SaveMacroRequest(string Job, string Name, List<MacroLine> Lines, string? OriginalName);
