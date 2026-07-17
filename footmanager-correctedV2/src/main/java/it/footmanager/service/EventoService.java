package it.footmanager.service;

import it.footmanager.dto.Dtos.*;
import it.footmanager.entity.*;
import it.footmanager.exception.*;
import it.footmanager.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service @RequiredArgsConstructor @Transactional
public class EventoService {

    private final EventoRepository     eventoRepo;
    private final CalendarioRepository calendarioRepo;

    @Transactional(readOnly = true)
    public List<EventoDto> findByCalendario(Integer calendarioId) {
        return eventoRepo.findByCalendario_IdOrderByDataOraInizioAsc(calendarioId)
                .stream().map(this::toDto).toList();
    }

    public EventoDto crea(CreaEventoRequest req) {
        Calendario cal = calendarioRepo.findById(req.getCalendarioId())
                .orElseThrow(() -> new ResourceNotFoundException("Calendario", Long.valueOf(req.getCalendarioId())));
        Evento e = new Evento();
        e.setTitolo(req.getTitolo()); e.setTipo(req.getTipo()); e.setLuogo(req.getLuogo());
        e.setDataOraInizio(req.getDataOraInizio()); e.setDataOraFine(req.getDataOraFine());
        e.setCalendario(cal);
        return toDto(eventoRepo.save(e));
    }

    public EventoDto aggiorna(Integer id, CreaEventoRequest req) {
        Evento e = eventoRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Evento", Long.valueOf(id)));
        e.setTitolo(req.getTitolo()); e.setTipo(req.getTipo()); e.setLuogo(req.getLuogo());
        e.setDataOraInizio(req.getDataOraInizio()); e.setDataOraFine(req.getDataOraFine());
        return toDto(eventoRepo.save(e));
    }

    public void elimina(Integer id) { eventoRepo.deleteById(id); }

    private EventoDto toDto(Evento e) {
        return EventoDto.builder().id(e.getId()).titolo(e.getTitolo()).tipo(e.getTipo())
                .dataOraInizio(e.getDataOraInizio()).dataOraFine(e.getDataOraFine()).luogo(e.getLuogo()).build();
    }
}
