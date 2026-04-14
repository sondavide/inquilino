package com.inquilino.dto.supervisor;

import java.util.List;

public record SupervisorNoteRequest(
        String       message,
        List<String> requestedItems
) {}
