package com.inquilino.dto.guarantor;

import java.math.BigDecimal;

/** Usato dal supervisore per impostare il reddito verificato di un garante */
public record GuarantorVerifyRequest(
        BigDecimal verifiedMonthlyIncome,
        String     note
) {}
