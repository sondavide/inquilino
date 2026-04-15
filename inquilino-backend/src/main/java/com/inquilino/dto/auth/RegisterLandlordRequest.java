package com.inquilino.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RegisterLandlordRequest {

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 8)
    private String password;

    private String phone;

    @NotBlank
    private String displayName;

    /** "PRIVATE" | "AGENCY" | "BUILDER" | "PROPERTY_MANAGER" */
    @NotBlank
    private String publisherType;

    // Agency-specific (opzionali per privati)
    private String agencyName;
    private String vatNumber;
    private String reaNumber;

    // Contact
    private String contactMode;    // platform_only | phone | email | mixed
    private String contactPhone;
    private String contactEmail;
    private String websiteUrl;

    public String getEmail()         { return email; }
    public String getPassword()      { return password; }
    public String getPhone()         { return phone; }
    public String getDisplayName()   { return displayName; }
    public String getPublisherType() { return publisherType; }
    public String getAgencyName()    { return agencyName; }
    public String getVatNumber()     { return vatNumber; }
    public String getReaNumber()     { return reaNumber; }
    public String getContactMode()   { return contactMode; }
    public String getContactPhone()  { return contactPhone; }
    public String getContactEmail()  { return contactEmail; }
    public String getWebsiteUrl()    { return websiteUrl; }

    /** Codice OTP inviato per email prima della registrazione. */
    private String verificationCode;
    public String getVerificationCode() { return verificationCode; }
}
