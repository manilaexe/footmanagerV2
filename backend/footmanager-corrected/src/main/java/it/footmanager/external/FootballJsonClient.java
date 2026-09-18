package it.footmanager.external;

import com.fasterxml.jackson.databind.ObjectMapper;
import it.footmanager.external.FootballJsonModels.StagioneRaw;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.Instant;

/**
 * Unico punto del progetto che parla con l'API esterna (openfootball).
 *
 * Perche' scarichiamo come String e poi parsiamo a mano con ObjectMapper
 * invece di usare restTemplate.getForObject(url, StagioneRaw.class)?
 * Perche' raw.githubusercontent.com restituisce il file con
 * Content-Type "text/plain" e NON "application/json": RestTemplate in quel
 * caso non saprebbe quale convertitore usare e lancerebbe un errore.
 * Scaricando il testo e parsandolo noi, il problema non si pone.
 *
 * La cache in memoria evita di ribussare a GitHub ad ogni refresh della
 * pagina: il dataset a monte viene aggiornato una volta al giorno, quindi
 * tenerlo in RAM per qualche ora e' piu' che sufficiente.
 */
@Component
public class FootballJsonClient {

    private final RestTemplate rest   = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${app.external.base-url}")        private String baseUrl;
    @Value("${app.external.stagione}")        private String stagione;
    @Value("${app.external.file-lega}")       private String fileLega;
    @Value("${app.external.cache-minuti:180}") private long cacheMinuti;

    /* --- cache semplice in memoria --- */
    private StagioneRaw cache;
    private Instant     scaricatoIl;

    public String urlCorrente() {
        return baseUrl + "/" + stagione + "/" + fileLega;
    }

    /**
     * Restituisce la stagione completa. Se la cache e' ancora "fresca" la
     * riusa; altrimenti riscarica. Se il download fallisce ma abbiamo una
     * copia vecchia in cache, restituiamo quella (meglio dati vecchi che
     * una pagina rotta).
     */
    public synchronized StagioneRaw scaricaStagione() {
        boolean cacheValida = cache != null
                && scaricatoIl != null
                && Duration.between(scaricatoIl, Instant.now()).toMinutes() < cacheMinuti;

        if (cacheValida) return cache;

        String url = urlCorrente();
        try {
            String json = rest.getForObject(url, String.class);
            StagioneRaw letta = mapper.readValue(json, StagioneRaw.class);
            cache       = letta;
            scaricatoIl = Instant.now();
            return cache;
        } catch (Exception ex) {
            if (cache != null) return cache;   // fallback: dati vecchi
            throw new IllegalStateException(
                    "Impossibile scaricare i dati Serie A da " + url + " -> " + ex.getMessage(), ex);
        }
    }

    /** Forza il riscaricamento alla prossima chiamata (usata dall'endpoint /refresh). */
    public synchronized void svuotaCache() {
        cache = null;
        scaricatoIl = null;
    }

    public synchronized Instant ultimoAggiornamento() {
        return scaricatoIl;
    }
}
