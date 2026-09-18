package it.footmanager.external;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

/**
 * Record che mappano il JSON di openfootball/football.json (file it.1.json
 * = Serie A).
 *
 * La documentazione ufficiale mostra "score" come oggetto:
 *   "score": { "ft": [2, 0], "ht": [1, 0] }
 * ma i file generati automaticamente a volte lo scrivono come array diretto:
 *   "score": [2, 0]
 * Per non dipendere da quale delle due forme arriva davvero, il campo
 * "score" e' letto come JsonNode grezzo e interpretato "a mano" dal metodo
 * golFullTime() qui sotto, che gestisce entrambi i casi senza mai lanciare
 * eccezioni (nel dubbio tratta la partita come "non ancora giocata").
 *
 * @JsonIgnoreProperties(ignoreUnknown = true) serve perche' il JSON puo'
 * contenere campi extra (goals1, goals2, ground...) che a noi non servono:
 * senza questa annotazione Jackson andrebbe in errore.
 */
public class FootballJsonModels {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record StagioneRaw(
            String name,            // es. "Serie A 2025/26"
            List<MatchRaw> matches
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MatchRaw(
            String round,           // es. "Matchday 12"
            String date,            // es. "2025-08-23"
            String time,            // spesso assente (null)
            String team1,           // squadra di CASA
            String team2,           // squadra in TRASFERTA
            JsonNode score          // forma libera: null | [g1,g2] | {"ft":[g1,g2]}
    ) {}

    /**
     * Estrae [gol casa, gol trasferta] dal campo "score", qualunque sia la
     * sua forma. Ritorna null se la partita non e' ancora stata giocata o
     * se il formato non e' quello atteso.
     */
    public static int[] golFullTime(JsonNode score) {
        if (score == null || score.isNull()) return null;

        // Forma A (documentata): { "ft": [2, 0] }
        if (score.isObject() && score.has("ft") && score.get("ft").isArray()) {
            JsonNode ft = score.get("ft");
            if (ft.size() >= 2 && ft.get(0).isNumber() && ft.get(1).isNumber()) {
                return new int[]{ ft.get(0).asInt(), ft.get(1).asInt() };
            }
            return null; // es. [null, null] = partita non ancora giocata
        }

        // Forma B (osservata nei file reali): "score": [2, 0]
        if (score.isArray()) {
            if (score.size() >= 2 && score.get(0).isNumber() && score.get(1).isNumber()) {
                return new int[]{ score.get(0).asInt(), score.get(1).asInt() };
            }
            return null;
        }

        return null;
    }
}