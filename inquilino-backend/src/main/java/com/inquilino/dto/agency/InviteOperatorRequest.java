package com.inquilino.dto.agency;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.util.List;
import java.util.UUID;

public record InviteOperatorRequest(
        @NotBlank @Email String email,
        @NotBlank String displayName,
        /** null = accesso a tutti gli annunci; lista UUID = solo quelli indicati */
        List<UUID> listingScope
) {}
