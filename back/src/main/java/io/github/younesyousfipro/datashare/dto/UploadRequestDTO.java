package io.github.younesyousfipro.datashare.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.web.multipart.MultipartFile;

// Multipart form fields, bound by name (not a JSON body)
public record UploadRequestDTO(
		@NotNull MultipartFile file,
		// Optional; 18: even at 4 bytes per character, stays within the 72-byte input limit of BCrypt
		@Size(min = 6, max = 18) String password,
		// Optional; null means the default duration, applied by the service
		@Min(1) @Max(7) Integer expirationDays) {
}
