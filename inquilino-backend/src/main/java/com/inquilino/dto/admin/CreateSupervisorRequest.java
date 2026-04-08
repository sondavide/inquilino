package com.inquilino.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateSupervisorRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8) String password,
        String phone
) {}
