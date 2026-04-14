package com.inquilino.service;

import com.inquilino.dto.supervisor.SupervisorNoteRequest;
import com.inquilino.entity.SupervisorNote;
import com.inquilino.repository.SupervisorNoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupervisorNoteService {

    private final SupervisorNoteRepository noteRepo;

    public List<SupervisorNote> listNotes(UUID tenantProfileId) {
        return noteRepo.findByTenantProfileIdOrderBySentAtDesc(tenantProfileId);
    }

    public List<SupervisorNote> listPending(UUID tenantProfileId) {
        return noteRepo.findByTenantProfileIdAndStatusOrderBySentAtDesc(tenantProfileId, "PENDING");
    }

    public SupervisorNote send(UUID tenantProfileId, UUID supervisorId, SupervisorNoteRequest req) {
        SupervisorNote note = SupervisorNote.builder()
                .tenantProfileId(tenantProfileId)
                .supervisorId(supervisorId)
                .message(req.message())
                .requestedItems(req.requestedItems())
                .status("PENDING")
                .build();
        return noteRepo.save(note);
    }

    /** Tenant notifica di aver risposto */
    public SupervisorNote markReplied(UUID noteId, UUID tenantProfileId) {
        SupervisorNote note = findForTenant(noteId, tenantProfileId);
        note.setStatus("REPLIED");
        note.setTenantRepliedAt(LocalDateTime.now());
        return noteRepo.save(note);
    }

    /** Supervisore chiude la richiesta */
    public SupervisorNote resolve(UUID noteId, UUID tenantProfileId) {
        SupervisorNote note = noteRepo.findById(noteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Note not found"));
        if (!note.getTenantProfileId().equals(tenantProfileId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Note does not belong to this profile");
        note.setStatus("RESOLVED");
        note.setResolvedAt(LocalDateTime.now());
        return noteRepo.save(note);
    }

    public void delete(UUID noteId) {
        noteRepo.deleteById(noteId);
    }

    private SupervisorNote findForTenant(UUID noteId, UUID tenantProfileId) {
        SupervisorNote note = noteRepo.findById(noteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Note not found"));
        if (!note.getTenantProfileId().equals(tenantProfileId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return note;
    }
}
