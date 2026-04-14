package com.inquilino.dto.supervisor;

import com.inquilino.entity.SupervisorNote;

import java.util.List;
import java.util.UUID;

public record SupervisorNoteDto(
        UUID         id,
        UUID         tenantProfileId,
        UUID         supervisorId,
        String       message,
        List<String> requestedItems,
        String       status,
        String       sentAt,
        String       tenantRepliedAt,
        String       resolvedAt
) {
    public static SupervisorNoteDto from(SupervisorNote n) {
        return new SupervisorNoteDto(
                n.getId(),
                n.getTenantProfileId(),
                n.getSupervisorId(),
                n.getMessage(),
                n.getRequestedItems(),
                n.getStatus(),
                n.getSentAt()           != null ? n.getSentAt().toString() : null,
                n.getTenantRepliedAt()  != null ? n.getTenantRepliedAt().toString() : null,
                n.getResolvedAt()       != null ? n.getResolvedAt().toString() : null
        );
    }
}
