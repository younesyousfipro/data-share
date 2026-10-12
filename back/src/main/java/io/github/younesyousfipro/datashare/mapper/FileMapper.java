package io.github.younesyousfipro.datashare.mapper;

import io.github.younesyousfipro.datashare.dto.FileResponseDTO;
import io.github.younesyousfipro.datashare.dto.FileStatus;
import io.github.younesyousfipro.datashare.model.SharedFile;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

@Component
public class FileMapper {

	private static final Duration EXPIRING_SOON_THRESHOLD = Duration.ofHours(24);

	// The password hash never leaves the API: only whether there is one
	public FileResponseDTO toResponse(SharedFile file) {
		return new FileResponseDTO(
				file.getId(),
				file.getOriginalName(),
				file.getSizeBytes(),
				file.getUploadedAt(),
				file.getExpiresAt(),
				statusOf(file.getExpiresAt()),
				file.getPasswordHash() != null);
	}

	private FileStatus statusOf(Instant expiresAt) {
		Instant now = Instant.now();
		if (!expiresAt.isAfter(now)) {
			return FileStatus.EXPIRED;
		}
		if (expiresAt.isBefore(now.plus(EXPIRING_SOON_THRESHOLD))) {
			return FileStatus.EXPIRING_SOON;
		}
		return FileStatus.ACTIVE;
	}

}
