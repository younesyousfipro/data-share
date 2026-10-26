package io.github.younesyousfipro.datashare.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequestDTO(
		// 254: size of account.email
		// regexp: @Email alone accepts a domain without a dot ("marie@mail"), valid on an intranet only
		@NotBlank @Email(regexp = ".+@.+\\..+") @Size(max = 254) String email,
		// 18: even at 4 bytes per character, stays within the 72-byte input limit of BCrypt
		@NotBlank @Size(min = 8, max = 18) String password) {
}
