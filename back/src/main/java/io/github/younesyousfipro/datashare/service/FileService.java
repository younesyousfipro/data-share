package io.github.younesyousfipro.datashare.service;

import io.github.younesyousfipro.datashare.dto.FileResponseDTO;
import io.github.younesyousfipro.datashare.dto.UploadRequestDTO;
import io.github.younesyousfipro.datashare.exception.InvalidFileException;
import io.github.younesyousfipro.datashare.mapper.FileMapper;
import io.github.younesyousfipro.datashare.model.SharedFile;
import io.github.younesyousfipro.datashare.repository.SharedFileRepository;
import io.github.younesyousfipro.datashare.storage.FileStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileService {

	private static final int DEFAULT_EXPIRATION_DAYS = 7;

	// Executables and scripts, classic malware vectors
	private static final Set<String> FORBIDDEN_EXTENSIONS =
			Set.of("exe", "bat", "cmd", "com", "msi", "sh", "ps1", "vbs", "jar");

	// Size of shared_file.original_name
	private static final int MAX_NAME_LENGTH = 255;

	private final SharedFileRepository sharedFileRepository;
	private final FileStorage fileStorage;
	private final PasswordEncoder passwordEncoder;
	private final FileMapper fileMapper;

	public FileResponseDTO upload(UploadRequestDTO request, Long accountId) {
		MultipartFile upload = request.file();
		String originalName = upload.getOriginalFilename();
		checkName(originalName);

		Instant now = Instant.now();
		int expirationDays = Objects.requireNonNullElse(request.expirationDays(), DEFAULT_EXPIRATION_DAYS);

		SharedFile file = new SharedFile();
		file.setId(UUID.randomUUID());
		file.setAccountId(accountId);
		file.setOriginalName(originalName);
		file.setSizeBytes(upload.getSize());
		file.setUploadedAt(now);
		file.setExpiresAt(now.plus(Duration.ofDays(expirationDays)));
		if (request.password() != null) {
			file.setPasswordHash(passwordEncoder.encode(request.password()));
		}

		// Disk first, then database: a failed insert removes the written file
		store(file.getId(), upload);
		try {
			sharedFileRepository.save(file);
		} catch (RuntimeException e) {
			fileStorage.delete(file.getId());
			throw e;
		}
		return fileMapper.toResponse(file);
	}

	private void checkName(String name) {
		if (name == null || name.isBlank() || name.length() > MAX_NAME_LENGTH) {
			throw new InvalidFileException("Invalid file name");
		}
		if (FORBIDDEN_EXTENSIONS.contains(extensionOf(name))) {
			throw new InvalidFileException("This file type is not allowed");
		}
	}

	// Last extension only, so "invoice.pdf.exe" gives "exe"; "" when there is none
	private String extensionOf(String name) {
		int lastDot = name.lastIndexOf('.');
		return lastDot < 0 ? "" : name.substring(lastDot + 1).toLowerCase(Locale.ROOT);
	}

	private void store(UUID id, MultipartFile upload) {
		try (InputStream content = upload.getInputStream()) {
			fileStorage.store(id, content);
		} catch (IOException e) {
			throw new UncheckedIOException(e);
		}
	}

}
