public record EquipmentSet(string Job, string Name, Dictionary<string, string?> Gear, Dictionary<string, string?>? ShortNames = null);

public record SaveEquipmentSetRequest(string Job, string Name, Dictionary<string, string?> Gear, string? OriginalName);
