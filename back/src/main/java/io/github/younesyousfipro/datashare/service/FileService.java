package io.github.younesyousfipro.datashare.service;

import io.github.younesyousfipro.datashare.dto.FileContentDTO;
import io.github.younesyousfipro.datashare.dto.FileMetadataResponseDTO;
import io.github.younesyousfipro.datashare.dto.FileResponseDTO;
import io.github.younesyousfipro.datashare.dto.UploadRequestDTO;
import io.github.younesyousfipro.datashare.exception.FileExpiredException;
import io.github.younesyousfipro.datashare.exception.InvalidFileException;
import io.github.younesyousfipro.datashare.exception.SharedFileNotFoundException;
import io.github.younesyousfipro.datashare.exception.WrongFilePasswordException;
import io.github.younesyousfipro.datashare.mapper.FileMapper;
import io.github.younesyousfipro.datashare.model.SharedFile;
import io.github.younesyousfipro.datashare.repository.SharedFileRepository;
import io.github.younesyousfipro.datashare.storage.FileStorage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Slf4j
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

	// Expired files included: the front sorts them into tabs
	public List<FileResponseDTO> listOwnedBy(Long accountId) {
		return sharedFileRepository.findByAccountIdOrderByUploadedAtDesc(accountId).stream()
				.map(fileMapper::toResponse)
				.toList();
	}

	// Another account's file gets the same 404 as an unknown one: its existence is not disclosed.
	// Expired files can be deleted too: the record is still there
	public void delete(UUID id, Long accountId) {
		SharedFile file = sharedFileRepository.findById(id)
				.filter(found -> found.getAccountId().equals(accountId))
				.orElseThrow(SharedFileNotFoundException::new);

		// Database first, then disk: a disk failure leaves an orphan file, never a record without its file
		sharedFileRepository.delete(file);
		try {
			fileStorage.delete(id);
		} catch (UncheckedIOException e) {
			log.warn("File {} deleted from the database but left on disk", id, e);
		}
	}

	public FileMetadataResponseDTO getMetadata(UUID id) {
		return fileMapper.toMetadataResponse(findDownloadable(id));
	}

	public FileContentDTO download(UUID id, String password) {
		SharedFile file = findDownloadable(id);
		checkPassword(file, password);
		// Opened last, once every check has passed: nothing can fail before Spring takes the stream and closes it
		return new FileContentDTO(file.getOriginalName(), file.getSizeBytes(), fileStorage.read(id));
	}

	// Unknown (404) then expired (410): an expired file is gone for everyone, password or not
	private SharedFile findDownloadable(UUID id) {
		SharedFile file = sharedFileRepository.findById(id).orElseThrow(SharedFileNotFoundException::new);
		if (!file.getExpiresAt().isAfter(Instant.now())) {
			throw new FileExpiredException();
		}
		return file;
	}

	// A password sent for an unprotected file is ignored
	private void checkPassword(SharedFile file, String password) {
		if (file.getPasswordHash() == null) {
			return;
		}
		if (password == null || !passwordEncoder.matches(password, file.getPasswordHash())) {
			throw new WrongFilePasswordException();
		}
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
