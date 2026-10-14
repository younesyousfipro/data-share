package io.github.younesyousfipro.datashare.dto;

import java.time.Instant;

// Public response: no id nor upload date, it discloses as little as possible
public record FileMetadataResponseDTO(
		String originalName,
		long sizeBytes,
		Instant expiresAt,
		boolean passwordProtected) {
}
