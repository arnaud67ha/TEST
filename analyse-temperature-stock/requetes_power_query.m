section Section1;

shared Dossier = "C:\Users\HG0047543\HARTMANN GROUP\BHF Digitalisation - Documents\60 CSV\Excel Spreadsheets\WI79-F2 et F1 Excel Condition de stockage\Test Query\LPV\" meta [IsParameterQuery = true, Type = "Text", IsParameterQueryRequired = true];

shared SeuilDureeHeures = 72 meta [IsParameterQuery = true, Type = "Number", IsParameterQueryRequired = true];

shared fx_DecalageFrance = (instantUTC as datetime) as number =>
let
    // Heure légale France : UTC+2 du dernier dimanche de mars 01:00 UTC au dernier dimanche d'octobre 01:00 UTC, sinon UTC+1
    Annee = Date.Year(instantUTC),
    DernierDimanche = (mois as number) as datetime =>
        let
            FinMois = Date.EndOfMonth(#date(Annee, mois, 1))
        in
            DateTime.From(Date.AddDays(FinMois, -Date.DayOfWeek(FinMois, Day.Sunday))),
    DebutEte = DernierDimanche(3) + #duration(0, 1, 0, 0),
    FinEte = DernierDimanche(10) + #duration(0, 1, 0, 0)
in
    if instantUTC >= DebutEte and instantUTC < FinEte then 2 else 1;

shared #"Sonde bas" = let
    Chemin = (if Text.EndsWith(Dossier, "\") then Dossier else Dossier & "\") & "Sonde bas.txt",
    Source = Csv.Document(File.Contents(Chemin), [Delimiter = ";", Columns = 5, Encoding = 65001, QuoteStyle = QuoteStyle.None]),
    SansEntete = Table.Skip(Source, 1),
    AjoutUTC = Table.AddColumn(SansEntete, "HorodatageUTC", each
        let s = Text.Trim([Column2]) in
        try #datetime(
            Number.From(Text.Middle(s, 0, 4)), Number.From(Text.Middle(s, 5, 2)), Number.From(Text.Middle(s, 8, 2)),
            Number.From(Text.Middle(s, 11, 2)), Number.From(Text.Middle(s, 14, 2)), Number.From(Text.Middle(s, 17, 2)))
        otherwise null, type nullable datetime),
    // Valeur vide ("Sensor read has failed") => ligne ignorée : on relie alors la valeur d'avant et celle d'après
    AjoutTemperature = Table.AddColumn(AjoutUTC, "Temperature", each try Number.From(Text.Trim([Column3]), "en-US") otherwise null, type nullable number),
    Valides = Table.SelectRows(AjoutTemperature, each [HorodatageUTC] <> null and [Temperature] <> null),
    AjoutHeureFrance = Table.AddColumn(Valides, "Horodatage", each [HorodatageUTC] + #duration(0, fx_DecalageFrance([HorodatageUTC]), 0, 0), type datetime),
    Colonnes = Table.SelectColumns(AjoutHeureFrance, {"Horodatage", "Temperature", "HorodatageUTC"}),
    Tri = Table.Sort(Colonnes, {{"HorodatageUTC", Order.Ascending}})
in
    Tri;

shared #"Sonde haut" = let
    Chemin = (if Text.EndsWith(Dossier, "\") then Dossier else Dossier & "\") & "Sonde haut.txt",
    Source = Csv.Document(File.Contents(Chemin), [Delimiter = ";", Columns = 5, Encoding = 65001, QuoteStyle = QuoteStyle.None]),
    SansEntete = Table.Skip(Source, 1),
    AjoutUTC = Table.AddColumn(SansEntete, "HorodatageUTC", each
        let s = Text.Trim([Column2]) in
        try #datetime(
            Number.From(Text.Middle(s, 0, 4)), Number.From(Text.Middle(s, 5, 2)), Number.From(Text.Middle(s, 8, 2)),
            Number.From(Text.Middle(s, 11, 2)), Number.From(Text.Middle(s, 14, 2)), Number.From(Text.Middle(s, 17, 2)))
        otherwise null, type nullable datetime),
    AjoutTemperature = Table.AddColumn(AjoutUTC, "Temperature", each try Number.From(Text.Trim([Column3]), "en-US") otherwise null, type nullable number),
    Valides = Table.SelectRows(AjoutTemperature, each [HorodatageUTC] <> null and [Temperature] <> null),
    AjoutHeureFrance = Table.AddColumn(Valides, "Horodatage", each [HorodatageUTC] + #duration(0, fx_DecalageFrance([HorodatageUTC]), 0, 0), type datetime),
    Colonnes = Table.SelectColumns(AjoutHeureFrance, {"Horodatage", "Temperature", "HorodatageUTC"}),
    Tri = Table.Sort(Colonnes, {{"HorodatageUTC", Order.Ascending}})
in
    Tri;

shared TempRef = let
    Chemin = (if Text.EndsWith(Dossier, "\") then Dossier else Dossier & "\") & "Température par ref.xlsx",
    Source = Excel.Workbook(File.Contents(Chemin), null, true),
    // 1er tableau du fichier (le nom de l'onglet change à chaque mise à jour), sinon 1re feuille
    Tableaux = Table.SelectRows(Source, each [Kind] = "Table"),
    Donnees = if Table.RowCount(Tableaux) > 0
        then Tableaux{0}[Data]
        else Table.PromoteHeaders(Table.SelectRows(Source, each [Kind] = "Sheet"){0}[Data], [PromoteAllScalars = true]),
    Colonnes = Table.SelectColumns(Donnees, {"Article", "Désignation article", "TempMini", "TempMaxi"}),
    Renomme = Table.RenameColumns(Colonnes, {{"Désignation article", "Désignation"}}),
    Types = Table.TransformColumns(Renomme, {
        {"Article", each if _ = null then null else Text.Trim(Text.From(_)), type nullable text},
        {"Désignation", each if _ = null then "" else Text.Trim(Text.From(_)), type text},
        {"TempMini", each try Number.From(_) otherwise null, type nullable number},
        {"TempMaxi", each try Number.From(_) otherwise null, type nullable number}}),
    // Références sans aucun seuil : non prises en compte
    AvecSeuil = Table.SelectRows(Types, each [Article] <> null and [Article] <> "" and ([TempMini] <> null or [TempMaxi] <> null)),
    SansDoublon = Table.Distinct(AvecSeuil, {"Article"})
in
    SansDoublon;

shared LT10 = let
    Chemin = (if Text.EndsWith(Dossier, "\") then Dossier else Dossier & "\") & "LT10.txt",
    Lignes = Lines.FromBinary(File.Contents(Chemin), null, null, 1252),
    Decoupe = List.Transform(Lignes, each List.Transform(Text.Split(_, "|"), Text.Trim)),
    // On garde uniquement les lignes du tableau (|...|), hors ligne d'en-tête
    LignesStock = List.Select(Decoupe, each List.Count(_) >= 14 and _{3} <> "" and _{3} <> "Article"),
    Table0 = Table.FromRows(List.Transform(LignesStock, each List.Range(_, 1, 12)),
        {"S", "Palette", "Article", "Type magasin", "Emplacement", "Date EM texte", "N° certificat", "T", "Lot", "DLC texte", "Quantité texte", "UQ"}),
    LireDate = (t as text) as nullable date =>
        try #date(Number.From(Text.Middle(t, 6, 4)), Number.From(Text.Middle(t, 3, 2)), Number.From(Text.Middle(t, 0, 2))) otherwise null,
    AjoutDateEM = Table.AddColumn(Table0, "Date EM", each LireDate([#"Date EM texte"]), type nullable date),
    AjoutDLC = Table.AddColumn(AjoutDateEM, "DLC", each LireDate([#"DLC texte"]), type nullable date),
    AjoutQuantite = Table.AddColumn(AjoutDLC, "Quantité", each
        try Number.From(Text.Replace(Text.Replace([#"Quantité texte"], ".", ""), ",", "."), "en-US") otherwise null, type nullable number),
    Colonnes = Table.SelectColumns(AjoutQuantite, {"Palette", "Article", "Emplacement", "Date EM", "Lot", "DLC", "Quantité", "UQ", "T"}),
    Types = Table.TransformColumnTypes(Colonnes, {{"Palette", type text}, {"Article", type text}, {"Emplacement", type text}, {"Lot", type text}, {"UQ", type text}, {"T", type text}})
in
    Types;

shared fx_Plages = (Releves as table, Seuil as number, Sens as text) as table =>
let
    // Releves doit être trié par HorodatageUTC croissant.
    // Une plage = suite de relevés consécutifs hors seuil. Une coupure de relevés entre deux valeurs hors seuil
    // ne coupe pas la plage (et sa durée est comptée) ; une seule valeur dans la plage la coupe.
    AjoutHors = Table.AddColumn(Releves, "Hors", each if Sens = "Bas" then [Temperature] < Seuil else [Temperature] > Seuil, type logical),
    Groupes = Table.Group(AjoutHors, {"Hors"}, {
        {"DebutUTC", each List.First([HorodatageUTC]), type datetime},
        {"FinUTC", each List.Last([HorodatageUTC]), type datetime},
        {"Debut", each List.First([Horodatage]), type datetime},
        {"Fin", each List.Last([Horodatage]), type datetime},
        {"TempExtreme", each if Sens = "Bas" then List.Min([Temperature]) else List.Max([Temperature]), type number},
        {"NbReleves", each Table.RowCount(_), Int64.Type}
    }, GroupKind.Local),
    HorsSeuil = Table.SelectRows(Groupes, each [Hors] = true),
    AjoutDuree = Table.AddColumn(HorsSeuil, "DureeHeures", each Duration.TotalHours([FinUTC] - [DebutUTC]), type number),
    AjoutSonde = Table.AddColumn(AjoutDuree, "Sonde", each Sens, type text),
    AjoutSeuil = Table.AddColumn(AjoutSonde, "Seuil", each Seuil, type number)
in
    Table.RemoveColumns(AjoutSeuil, {"Hors"});

shared Plages_72h = let
    Bas = Table.Buffer(#"Sonde bas"),
    Haut = Table.Buffer(#"Sonde haut"),
    DernierBas = List.Max(Bas[HorodatageUTC]),
    DernierHaut = List.Max(Haut[HorodatageUTC]),
    // Sonde bas contrôle le mini de la référence, sonde haut contrôle le maxi
    SeuilsMini = List.Distinct(List.RemoveNulls(TempRef[TempMini])),
    SeuilsMaxi = List.Distinct(List.RemoveNulls(TempRef[TempMaxi])),
    Vide = #table(type table [DebutUTC = datetime, FinUTC = datetime, Debut = datetime, Fin = datetime, TempExtreme = number,
        NbReleves = Int64.Type, DureeHeures = number, Sonde = text, Seuil = number], {}),
    Toutes = Table.Combine({Vide}
        & List.Transform(SeuilsMini, each fx_Plages(Bas, _, "Bas"))
        & List.Transform(SeuilsMaxi, each fx_Plages(Haut, _, "Haut"))),
    Longues = Table.SelectRows(Toutes, each [DureeHeures] >= SeuilDureeHeures),
    // "En cours" = la plage court encore au dernier relevé de la sonde
    AjoutEnCours = Table.AddColumn(Longues, "EnCours", each [FinUTC] = (if [Sonde] = "Bas" then DernierBas else DernierHaut), type logical)
in
    Table.Buffer(AjoutEnCours);

shared Detail_depassements = let
    Plages = Plages_72h,
    Stock = Table.SelectRows(LT10, each [#"Date EM"] <> null),
    Jointure = Table.NestedJoin(Stock, {"Article"}, TempRef, {"Article"}, "Ref", JoinKind.Inner),
    AvecRef = Table.ExpandTableColumn(Jointure, "Ref", {"Désignation", "TempMini", "TempMaxi"}),
    // Entrée de la palette = Date EM à 00:00 heure France, convertie en UTC
    AjoutEntree = Table.AddColumn(AvecRef, "EntreeUTC", each
        let m = DateTime.From([#"Date EM"]) in m - #duration(0, fx_DecalageFrance(m), 0, 0), type datetime),
    AjoutPlages = Table.AddColumn(AjoutEntree, "Plages", (ligne) =>
        Table.SelectRows(Plages, each
            (([Sonde] = "Bas" and [Seuil] = ligne[TempMini]) or ([Sonde] = "Haut" and [Seuil] = ligne[TempMaxi]))
            and [FinUTC] > ligne[EntreeUTC])),
    AvecPlage = Table.SelectRows(AjoutPlages, each not Table.IsEmpty([Plages])),
    Developpe = Table.ExpandTableColumn(AvecPlage, "Plages", {"Sonde", "Seuil", "TempExtreme", "DebutUTC", "FinUTC", "Debut", "Fin", "EnCours"}),
    // Seule la partie de la plage postérieure à l'entrée en stock compte
    AjoutDureeBrute = Table.AddColumn(Developpe, "DureeBrute", each Duration.TotalHours([FinUTC] - List.Max({[DebutUTC], [EntreeUTC]})), type number),
    Depassements = Table.SelectRows(AjoutDureeBrute, each [DureeBrute] >= SeuilDureeHeures),
    AjoutDebutExpo = Table.AddColumn(Depassements, "Début exposition", each if [EntreeUTC] > [DebutUTC] then DateTime.From([#"Date EM"]) else [Debut], type datetime),
    AjoutDureeH = Table.AddColumn(AjoutDebutExpo, "Durée (h)", each Number.Round([DureeBrute], 1), type number),
    AjoutDureeJ = Table.AddColumn(AjoutDureeH, "Durée (jours)", each Number.Round([DureeBrute] / 24, 1), type number),
    AjoutType = Table.AddColumn(AjoutDureeJ, "Type", each if [Sonde] = "Bas" then "Froid (sonde bas < mini)" else "Chaud (sonde haut > maxi)", type text),
    AjoutStatut = Table.AddColumn(AjoutType, "Statut", each if [EnCours] then "En cours" else "Terminé", type text),
    Renomme = Table.RenameColumns(AjoutStatut, {{"Seuil", "Seuil (°C)"}, {"TempExtreme", "Temp. extrême (°C)"}, {"Fin", "Fin exposition"}}),
    Colonnes = Table.SelectColumns(Renomme, {"Article", "Désignation", "Lot", "Palette", "Emplacement", "Date EM", "Quantité", "UQ",
        "Type", "Seuil (°C)", "Temp. extrême (°C)", "Début exposition", "Fin exposition", "Durée (h)", "Durée (jours)", "Statut"}),
    Tri = Table.Sort(Colonnes, {{"Statut", Order.Ascending}, {"Article", Order.Ascending}, {"Palette", Order.Ascending}, {"Début exposition", Order.Ascending}})
in
    Tri;

shared Produits_en_depassement = let
    Source = Detail_depassements,
    Il1an = Date.AddYears(DateTime.LocalNow(), -1),
    Groupe = Table.Group(Source, {"Article", "Désignation", "Lot", "Palette", "Emplacement", "Date EM", "Quantité", "UQ"}, {
        {"Dépassement en cours", each if List.Contains([Statut], "En cours") then "Oui" else "Non", type text},
        {"Nb dépassements", each Table.RowCount(_), Int64.Type},
        {"Dont 12 derniers mois", each List.Count(List.Select([#"Fin exposition"], (f) => f >= Il1an)), Int64.Type},
        {"Cumul (h)", each List.Sum([#"Durée (h)"]), type number},
        {"Durée max (h)", each List.Max([#"Durée (h)"]), type number},
        {"Dernière fin de dépassement", each List.Max([#"Fin exposition"]), type datetime},
        {"Détail", each Text.Combine(
            List.Transform(Table.ToRecords(Table.Sort(_, {{"Début exposition", Order.Ascending}})), (r) =>
                (if Text.StartsWith(r[Type], "Froid") then "< " else "> ") & Text.From(r[#"Seuil (°C)"]) & "°C du "
                & DateTime.ToText(r[#"Début exposition"], "dd/MM/yyyy") & " au " & DateTime.ToText(r[#"Fin exposition"], "dd/MM/yyyy")
                & " (" & Text.From(r[#"Durée (h)"]) & " h" & (if r[Statut] = "En cours" then ", en cours" else "") & ")"),
            " ; "), type text}
    }),
    Tri = Table.Sort(Groupe, {{"Dépassement en cours", Order.Descending}, {"Nb dépassements", Order.Descending}, {"Article", Order.Ascending}, {"Palette", Order.Ascending}})
in
    Tri;

shared Recap_12_mois = let
    Il1an = Date.AddYears(DateTime.LocalNow(), -1),
    Plages = Plages_72h,
    StockAvecRef = Table.NestedJoin(LT10, {"Article"}, TempRef, {"Article"}, "Ref", JoinKind.Inner),
    ParArticle = Table.Group(StockAvecRef, {"Article"}, {
        {"Lignes en stock", each Table.RowCount(_), Int64.Type},
        {"Plus ancienne entrée", each List.Min([#"Date EM"]), type nullable date}}),
    Jointure = Table.NestedJoin(ParArticle, {"Article"}, TempRef, {"Article"}, "Ref", JoinKind.Inner),
    AvecRef = Table.ExpandTableColumn(Jointure, "Ref", {"Désignation", "TempMini", "TempMaxi"}),
    // Dépassements de la zone (>= durée mini) sur les seuils de l'article, terminés ou en cours dans les 12 derniers mois
    AjoutPlages = Table.AddColumn(AvecRef, "Plages12m", (a) =>
        Table.SelectRows(Plages, each
            (([Sonde] = "Bas" and [Seuil] = a[TempMini]) or ([Sonde] = "Haut" and [Seuil] = a[TempMaxi]))
            and [Fin] >= Il1an)),
    AjoutNb = Table.AddColumn(AjoutPlages, "Nb dépassements 12 mois", each Table.RowCount([Plages12m]), Int64.Type),
    AjoutFlag = Table.AddColumn(AjoutNb, "Dépassement depuis 1 an", each if [#"Nb dépassements 12 mois"] > 0 then "Oui" else "Non", type text),
    AjoutEnCours = Table.AddColumn(AjoutFlag, "Dépassement en cours", each if List.Contains([Plages12m][EnCours], true) then "Oui" else "Non", type text),
    AjoutDernier = Table.AddColumn(AjoutEnCours, "Dernier dépassement (fin)", each List.Max([Plages12m][Fin]), type nullable datetime),
    AjoutMax = Table.AddColumn(AjoutDernier, "Durée max 12 mois (h)", each Number.Round(List.Max([Plages12m][DureeHeures]), 1), type nullable number),
    // Palettes actuellement en stock réellement exposées (depuis leur entrée)
    Exposees = Table.Group(Detail_depassements, {"Article"}, {{"Palettes exposées", each List.Count(List.Distinct([Palette])), Int64.Type}}),
    JointureExpo = Table.NestedJoin(AjoutMax, {"Article"}, Exposees, {"Article"}, "Expo", JoinKind.LeftOuter),
    DeveloppeExpo = Table.ExpandTableColumn(JointureExpo, "Expo", {"Palettes exposées"}),
    Zero = Table.TransformColumns(DeveloppeExpo, {{"Palettes exposées", each if _ = null then 0 else _, Int64.Type}}),
    Renomme = Table.RenameColumns(Zero, {{"TempMini", "Temp. mini (°C)"}, {"TempMaxi", "Temp. maxi (°C)"}}),
    Colonnes = Table.SelectColumns(Renomme, {"Article", "Désignation", "Temp. mini (°C)", "Temp. maxi (°C)", "Lignes en stock", "Plus ancienne entrée",
        "Dépassement depuis 1 an", "Nb dépassements 12 mois", "Dépassement en cours", "Dernier dépassement (fin)", "Durée max 12 mois (h)", "Palettes exposées"}),
    Tri = Table.Sort(Colonnes, {{"Dépassement depuis 1 an", Order.Descending}, {"Palettes exposées", Order.Descending}, {"Article", Order.Ascending}})
in
    Tri;

shared Infos = let
    Bas = #"Sonde bas",
    Haut = #"Sonde haut",
    Fmt = (d) => if d = null then "" else DateTime.ToText(d, "dd/MM/yyyy HH:mm"),
    Stock = LT10,
    ArticlesRef = List.Buffer(TempRef[Article]),
    Analysees = Table.RowCount(Table.SelectRows(Stock, each [#"Date EM"] <> null and List.Contains(ArticlesRef, [Article]))),
    Produits = Produits_en_depassement,
    Recap = Recap_12_mois,
    Lignes = {
        {"Date de l'analyse", Fmt(DateTime.LocalNow())},
        {"Relevés sonde bas", "du " & Fmt(List.Min(Bas[Horodatage])) & " au " & Fmt(List.Max(Bas[Horodatage]))},
        {"Relevés sonde haut", "du " & Fmt(List.Min(Haut[Horodatage])) & " au " & Fmt(List.Max(Haut[Horodatage]))},
        {"Durée minimale d'un dépassement (h)", Text.From(SeuilDureeHeures)},
        {"Lignes de stock (LT10)", Text.From(Table.RowCount(Stock))},
        {"Lignes analysées (article avec seuil)", Text.From(Analysees)},
        {"Lignes non prises en compte (article sans seuil)", Text.From(Table.RowCount(Stock) - Analysees)},
        {"Palettes avec dépassement", Text.From(Table.RowCount(Produits))},
        {"dont dépassement en cours", Text.From(Table.RowCount(Table.SelectRows(Produits, each [#"Dépassement en cours"] = "Oui")))},
        {"Articles en stock avec dépassement depuis 1 an", Text.From(Table.RowCount(Table.SelectRows(Recap, each [#"Dépassement depuis 1 an"] = "Oui")))}
    },
    Resultat = #table(type table [Indicateur = text, Valeur = text], Lignes)
in
    Resultat;
