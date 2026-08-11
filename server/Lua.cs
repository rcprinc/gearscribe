public record LuaStateEntry(string? EquipmentSet, string Lua);

public record LuaGeneralSection(LuaStateEntry Idle, LuaStateEntry Engaged, LuaStateEntry Resting, LuaStateEntry WeaponSkill);

public record LuaElementStateSection(
    LuaStateEntry General,
    LuaStateEntry Fire,
    LuaStateEntry Earth,
    LuaStateEntry Water,
    LuaStateEntry Wind,
    LuaStateEntry Ice,
    LuaStateEntry Light,
    LuaStateEntry Dark);

public record LuaElementSection(LuaElementStateSection Precast, LuaElementStateSection Midcast);

public record LuaMacroBookEntry(string Book, string Set);

public record LuaJobAbilityEntry(string AbilityName, string? EquipmentSet, string Lua);

public record LuaSpellEntry(string SpellName, string? EquipmentSet, string Lua);

public record LuaPetEntry(string AbilityName, string? EquipmentSet, string Lua);

public record LuaSections(
    LuaGeneralSection General,
    LuaMacroBookEntry? MacroBook = null,
    LuaElementSection? Element = null,
    List<LuaJobAbilityEntry>? JobAbilities = null,
    List<LuaSpellEntry>? Spells = null,
    List<LuaPetEntry>? PetAbilities = null);

public record LuaDocument(string Job, string? Subjob, LuaSections Sections);

public record UpdateLuaFileRequest(string Job, string Content);
