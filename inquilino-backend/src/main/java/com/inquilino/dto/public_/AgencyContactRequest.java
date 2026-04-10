package com.inquilino.dto.public_;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AgencyContactRequest(

    @NotBlank @Size(max = 100)
    String name,

    @NotBlank @Email @Size(max = 200)
    String email,

    @NotBlank @Size(max = 150)
    String agencyName,

    @NotBlank @Size(max = 100)
    String city,

    @Size(max = 2000)
    String message
) {}
