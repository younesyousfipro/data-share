package io.github.younesyousfipro.datashare.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

// No size rule on the password: one outside the registration rules (8 to 18 characters)
// matches no account, so it is rejected as a wrong password (401)
public record LoginRequestDTO(@NotBlank @Email String email, @NotBlank String password) {
}
