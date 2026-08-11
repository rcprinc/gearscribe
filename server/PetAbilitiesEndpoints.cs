using System.Text.Json;

public static class PetAbilitiesEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static void MapPetAbilitiesEndpoints(this WebApplication app, string dataDir)
    {
        var path = Path.Combine(dataDir, "JobInfo", "Pet.txt");

        app.MapGet("/api/pet-abilities", () =>
        {
            if (!File.Exists(path))
            {
                return Results.Ok(new Dictionary<string, string[]>());
            }

            var abilities = JsonSerializer.Deserialize<Dictionary<string, string[]>>(File.ReadAllText(path), JsonOptions)
                ?? new Dictionary<string, string[]>();
            return Results.Ok(abilities);
        });
    }
}
