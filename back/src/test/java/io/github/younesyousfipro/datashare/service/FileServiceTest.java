package io.github.younesyousfipro.datashare.service;

import io.github.younesyousfipro.datashare.dto.FileResponseDTO;
import io.github.younesyousfipro.datashare.dto.FileStatus;
import io.github.younesyousfipro.datashare.dto.UploadRequestDTO;
import io.github.younesyousfipro.datashare.exception.InvalidFileException;
import io.github.younesyousfipro.datashare.mapper.FileMapper;
import io.github.younesyousfipro.datashare.model.SharedFile;
import io.github.younesyousfipro.datashare.repository.SharedFileRepository;
import io.github.younesyousfipro.datashare.storage.FileStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FileServiceTest {

	private static final Long ACCOUNT_ID = 42L;
	private static final String FILE_PASSWORD = "s3cret";

	@Mock
	private SharedFileRepository sharedFileRepository;

	@Mock
	private FileStorage fileStorage;

	// Real encoder and mapper: pure computation without I/O, a mock would isolate from nothing
	private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
	private final FileMapper fileMapper = new FileMapper();

	private FileService fileService;

	@BeforeEach
	void setUp() {
		fileService = new FileService(sharedFileRepository, fileStorage, passwordEncoder, fileMapper);
	}

	@Test
	void upload_storesFileThenSavesRecordWithDefaultExpiry() {
		// WHEN
		FileResponseDTO response = fileService.upload(request("vacances.mp4", null, null), ACCOUNT_ID);

		// THEN: disk first, then database, under the same UUID
		SharedFile saved = captureSaved();
		InOrder order = inOrder(fileStorage, sharedFileRepository);
		order.verify(fileStorage).store(eq(saved.getId()), any());
		order.verify(sharedFileRepository).save(saved);

		assertThat(saved.getAccountId()).isEqualTo(ACCOUNT_ID);
		assertThat(saved.getOriginalName()).isEqualTo("vacances.mp4");
		assertThat(saved.getSizeBytes()).isEqualTo(5);
		assertThat(saved.getPasswordHash()).isNull();
		assertThat(Duration.between(saved.getUploadedAt(), saved.getExpiresAt())).isEqualTo(Duration.ofDays(7));

		assertThat(response.id()).isEqualTo(saved.getId());
		assertThat(response.status()).isEqualTo(FileStatus.ACTIVE);
		assertThat(response.passwordProtected()).isFalse();
	}

	@Test
	void upload_withExpirationDays_usesThem() {
		// WHEN
		fileService.upload(request("vacances.mp4", null, 3), ACCOUNT_ID);

		// THEN
		SharedFile saved = captureSaved();
		assertThat(Duration.between(saved.getUploadedAt(), saved.getExpiresAt())).isEqualTo(Duration.ofDays(3));
	}

	@Test
	void upload_withPassword_savesHashOnly() {
		// WHEN
		FileResponseDTO response = fileService.upload(request("vacances.mp4", FILE_PASSWORD, null), ACCOUNT_ID);

		// THEN
		SharedFile saved = captureSaved();
		assertThat(saved.getPasswordHash()).isNotEqualTo(FILE_PASSWORD);
		assertThat(passwordEncoder.matches(FILE_PASSWORD, saved.getPasswordHash())).isTrue();
		assertThat(response.passwordProtected()).isTrue();
	}

	@ParameterizedTest
	@ValueSource(strings = {"virus.exe", "invoice.pdf.EXE", "script.sh", "app.jar"})
	void upload_forbiddenExtension_rejectedBeforeAnyWrite(String name) {
		assertThatThrownBy(() -> fileService.upload(request(name, null, null), ACCOUNT_ID))
				.isInstanceOf(InvalidFileException.class);
		verifyNoInteractions(fileStorage, sharedFileRepository);
	}

	@ParameterizedTest
	@ValueSource(strings = {"README", "photo.jpg", "archive.exe.zip"})
	void upload_allowedName_isStored(String name) {
		fileService.upload(request(name, null, null), ACCOUNT_ID);

		assertThat(captureSaved().getOriginalName()).isEqualTo(name);
	}

	@Test
	void upload_blankOrTooLongName_rejectedBeforeAnyWrite() {
		assertThatThrownBy(() -> fileService.upload(request(" ", null, null), ACCOUNT_ID))
				.isInstanceOf(InvalidFileException.class);
		assertThatThrownBy(() -> fileService.upload(request("a".repeat(256), null, null), ACCOUNT_ID))
				.isInstanceOf(InvalidFileException.class);
		verifyNoInteractions(fileStorage, sharedFileRepository);
	}

	@Test
	void upload_databaseFailure_deletesStoredFile() {
		// GIVEN
		DataAccessResourceFailureException failure = new DataAccessResourceFailureException("database down");
		when(sharedFileRepository.save(any())).thenThrow(failure);

		// WHEN / THEN: the original error goes up, and the file written on disk is removed
		assertThatThrownBy(() -> fileService.upload(request("vacances.mp4", null, null), ACCOUNT_ID))
				.isSameAs(failure);
		SharedFile attempted = captureSaved();
		verify(fileStorage).delete(attempted.getId());
	}

	private UploadRequestDTO request(String name, String password, Integer expirationDays) {
		MockMultipartFile file = new MockMultipartFile("file", name, "application/octet-stream",
				"hello".getBytes(StandardCharsets.UTF_8));
		return new UploadRequestDTO(file, password, expirationDays);
	}

	private SharedFile captureSaved() {
		ArgumentCaptor<SharedFile> saved = ArgumentCaptor.forClass(SharedFile.class);
		verify(sharedFileRepository).save(saved.capture());
		return saved.getValue();
	}

}
