package com.inquilino.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RegisterAgencyRequest {

    @NotBlank @Email
    private String email;

    @NotBlank @Size(min = 8)
    private String password;

    private String phone;

    @NotBlank
    private String agencyName;

    private String vatNumber;
    private String reaNumber;
    private String websiteUrl;
    private String contactPhone;

    @NotBlank
    private String verificationCode;

    public String getEmail()            { return email; }
    public String getPassword()         { return password; }
    public String getPhone()            { return phone; }
    public String getAgencyName()       { return agencyName; }
    public String getVatNumber()        { return vatNumber; }
    public String getReaNumber()        { return reaNumber; }
    public String getWebsiteUrl()       { return websiteUrl; }
    public String getContactPhone()     { return contactPhone; }
    public String getVerificationCode() { return verificationCode; }
}
