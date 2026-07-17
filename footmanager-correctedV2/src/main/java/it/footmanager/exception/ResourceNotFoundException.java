package it.footmanager.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String msg) { super(msg); }
    public ResourceNotFoundException(String entity, Long id) {
        super(entity + " con id=" + id + " non trovato/a");
    }
}
