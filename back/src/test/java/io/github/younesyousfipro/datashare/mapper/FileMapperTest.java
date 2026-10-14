package io.github.younesyousfipro.datashare.mapper;

import io.github.younesyousfipro.datashare.dto.FileMetadataResponseDTO;
import io.github.younesyousfipro.datashare.dto.FileResponseDTO;
import io.github.younesyousfipro.datashare.dto.FileStatus;
import io.github.younesyousfipro.datashare.model.SharedFile;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class FileMapperTest {

	private final FileMapper fileMapper = new FileMapper();

	@Test
	void toResponse_copiesFieldsWithoutPassword() {
		// GIVEN
		SharedFile file = fileExpiringIn(Duration.ofDays(7));

		// WHEN
		FileResponseDTO response = fileMapper.toResponse(file);

		// THEN
		assertThat(response.id()).isEqualTo(file.getId());
		assertThat(response.originalName()).isEqualTo("vacances.mp4");
		assertThat(response.sizeBytes()).isEqualTo(2_726_297L);
		assertThat(response.uploadedAt()).isEqualTo(file.getUploadedAt());
		assertThat(response.expiresAt()).isEqualTo(file.getExpiresAt());
		assertThat(response.passwordProtected()).isFalse();
	}

	@Test
	void toResponse_withPasswordHash_isPasswordProtected() {
		// GIVEN
		SharedFile file = fileExpiringIn(Duration.ofDays(7));
		file.setPasswordHash("$2a$10$hash");

		// WHEN / THEN
		assertThat(fileMapper.toResponse(file).passwordProtected()).isTrue();
	}

	// Durations far from the thresholds: the mapper reads the clock a few milliseconds after the test
	@Test
	void toResponse_moreThanOneDayLeft_isActive() {
		assertThat(fileMapper.toResponse(fileExpiringIn(Duration.ofDays(2))).status())
				.isEqualTo(FileStatus.ACTIVE);
	}

	@Test
	void toResponse_lessThanOneDayLeft_isExpiringSoon() {
		assertThat(fileMapper.toResponse(fileExpiringIn(Duration.ofHours(1))).status())
				.isEqualTo(FileStatus.EXPIRING_SOON);
	}

	@Test
	void toResponse_expiryPassed_isExpired() {
		assertThat(fileMapper.toResponse(fileExpiringIn(Duration.ofHours(-1))).status())
				.isEqualTo(FileStatus.EXPIRED);
	}

	@Test
	void toMetadataResponse_copiesPublicFields() {
		// GIVEN
		SharedFile file = fileExpiringIn(Duration.ofDays(7));

		// WHEN
		FileMetadataResponseDTO response = fileMapper.toMetadataResponse(file);

		// THEN
		assertThat(response.originalName()).isEqualTo("vacances.mp4");
		assertThat(response.sizeBytes()).isEqualTo(2_726_297L);
		assertThat(response.expiresAt()).isEqualTo(file.getExpiresAt());
		assertThat(response.passwordProtected()).isFalse();
	}

	@Test
	void toMetadataResponse_withPasswordHash_isPasswordProtected() {
		// GIVEN
		SharedFile file = fileExpiringIn(Duration.ofDays(7));
		file.setPasswordHash("$2a$10$hash");

		// WHEN / THEN
		assertThat(fileMapper.toMetadataResponse(file).passwordProtected()).isTrue();
	}

	private SharedFile fileExpiringIn(Duration timeLeft) {
		Instant now = Instant.now();
		SharedFile file = new SharedFile();
		file.setId(UUID.randomUUID());
		file.setAccountId(42L);
		file.setOriginalName("vacances.mp4");
		file.setSizeBytes(2_726_297L);
		file.setUploadedAt(now.minus(Duration.ofDays(1)));
		file.setExpiresAt(now.plus(timeLeft));
		return file;
	}

}
