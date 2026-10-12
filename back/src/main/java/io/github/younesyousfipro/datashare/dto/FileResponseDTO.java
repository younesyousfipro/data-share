package io.github.younesyousfipro.datashare.dto;

import java.time.Instant;
import java.util.UUID;

public record FileResponseDTO(
		UUID id,
		String originalName,
		long sizeBytes,
		Instant uploadedAt,
		Instant expiresAt,
		FileStatus status,
		boolean passwordProtected) {
}
