using System.Text.Json;

public static class LuasEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    public static void MapLuasEndpoints(this WebApplication app, string dataDir, string settingsDir)
    {
        app.MapGet("/api/luas/subjobs", () => GetAllSubjobLuas(dataDir));
        app.MapGet("/api/luas/{job}", (string job) => GetLua(dataDir, job, null));
        app.MapGet("/api/luas/{job}/subjobs", (string job) => GetSubjobLuas(dataDir, job));
        app.MapGet("/api/luas/{job}/{subjob}", (string job, string subjob) => GetLua(dataDir, job, subjob));

        app.MapPost("/api/luas", (LuaDocument request) =>
        {
            var job = Sanitize(request.Job);
            var subjob = string.IsNullOrWhiteSpace(request.Subjob) ? null : Sanitize(request.Subjob);

            if (job.Length == 0)
            {
                return Results.BadRequest("Job is required.");
            }

            Directory.CreateDirectory(dataDir);
            var path = PathFor(dataDir, job, subjob);
            var doc = new LuaDocument(job, subjob, request.Sections);
            File.WriteAllText(path, JsonSerializer.Serialize(doc, JsonOptions));

            return Results.Ok();
        });

        app.MapPost("/api/luas/update-file", (UpdateLuaFileRequest request) =>
        {
            var session = LoadSession(settingsDir);
            if (session is null || !session.SignedIn || string.IsNullOrWhiteSpace(session.Name))
            {
                return Results.BadRequest(new
                {
                    code = "no-username",
                    message = "We do not currently have your username. Please go to settings and complete the \"+Add Profile Info\" section.",
                });
            }

            var gamePath = GamePathLookup.Load(settingsDir);
            if (!Directory.Exists(gamePath))
            {
                return Results.BadRequest(new
                {
                    code = "no-game-path",
                    message = "Your game is not installed in the default location, Please go to settings and set its location",
                });
            }

            var addonDir = Path.Combine(gamePath, "config", "addons", "LuAshitacast");
            var characterDir = Directory.Exists(addonDir)
                ? Directory.GetDirectories(addonDir, $"{session.Name}_*").FirstOrDefault()
                : null;

            if (characterDir is null)
            {
                return Results.BadRequest(new
                {
                    code = "no-addon",
                    message = "You currently don't have the LuAshitacast addon. Open the client and add this addon and load the game once.",
                });
            }

            var job = Sanitize(request.Job);
            if (job.Length == 0)
            {
                return Results.BadRequest(new { code = "invalid-job", message = "Job is required." });
            }

            File.WriteAllText(Path.Combine(characterDir, $"{job}.lua"), request.Content);
            return Results.Ok();
        });
    }

    private static CharacterSession? LoadSession(string settingsDir)
    {
        var path = Path.Combine(settingsDir, "session.json");
        if (!File.Exists(path))
        {
            return null;
        }

        return JsonSerializer.Deserialize<CharacterSession>(File.ReadAllText(path), JsonOptions);
    }

    private static IResult GetLua(string dataDir, string job, string? subjob)
    {
        var sanitizedJob = Sanitize(job);
        var sanitizedSubjob = string.IsNullOrWhiteSpace(subjob) ? null : Sanitize(subjob);
        if (sanitizedJob.Length == 0)
        {
            return Results.NotFound();
        }

        var path = PathFor(dataDir, sanitizedJob, sanitizedSubjob);
        if (!File.Exists(path))
        {
            return Results.NotFound();
        }

        var doc = JsonSerializer.Deserialize<LuaDocument>(File.ReadAllText(path), JsonOptions);
        return Results.Ok(doc);
    }

    private static IResult GetSubjobLuas(string dataDir, string job)
    {
        var sanitizedJob = Sanitize(job);
        if (sanitizedJob.Length == 0 || !Directory.Exists(dataDir))
        {
            return Results.Ok(Array.Empty<LuaDocument>());
        }

        var docs = Directory.GetFiles(dataDir, $"{sanitizedJob}-*.json")
            .Select(path => JsonSerializer.Deserialize<LuaDocument>(File.ReadAllText(path), JsonOptions))
            .Where(doc => doc is not null)
            .ToArray();

        return Results.Ok(docs);
    }

    private static IResult GetAllSubjobLuas(string dataDir)
    {
        if (!Directory.Exists(dataDir))
        {
            return Results.Ok(new Dictionary<string, string[]>());
        }

        var grouped = new Dictionary<string, List<string>>();
        foreach (var path in Directory.GetFiles(dataDir, "*-*.json"))
        {
            var doc = JsonSerializer.Deserialize<LuaDocument>(File.ReadAllText(path), JsonOptions);
            if (doc is null || string.IsNullOrWhiteSpace(doc.Subjob))
            {
                continue;
            }

            if (!grouped.TryGetValue(doc.Job, out var list))
            {
                list = new List<string>();
                grouped[doc.Job] = list;
            }

            list.Add(doc.Subjob);
        }

        return Results.Ok(grouped.ToDictionary(kv => kv.Key, kv => kv.Value.ToArray()));
    }

    private static string PathFor(string dataDir, string job, string? subjob)
    {
        var fileName = subjob is null ? $"{job}.json" : $"{job}-{subjob}.json";
        return Path.Combine(dataDir, fileName);
    }

    private static string Sanitize(string value) =>
        new string(value.Where(c => char.IsLetterOrDigit(c) || c is '_' or '-' or ' ').ToArray()).Trim();
}
