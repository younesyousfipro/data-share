package io.github.younesyousfipro.datashare.service;

import io.github.younesyousfipro.datashare.model.SharedFile;
import io.github.younesyousfipro.datashare.repository.SharedFileRepository;
import io.github.younesyousfipro.datashare.storage.FileStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FilePurgeServiceTest {

	@Mock
	private SharedFileRepository sharedFileRepository;

	@Mock
	private FileStorage fileStorage;

	private FilePurgeService filePurgeService;

	@BeforeEach
	void setUp() {
		filePurgeService = new FilePurgeService(sharedFileRepository, fileStorage);
	}

	@Test
	void purgeExpiredFiles_deletesEachExpiredFileFromDisk() {
		// GIVEN
		SharedFile first = fileWithId();
		SharedFile second = fileWithId();
		when(sharedFileRepository.findByExpiresAtBefore(any())).thenReturn(List.of(first, second));

		// WHEN
		filePurgeService.purgeExpiredFiles();

		// THEN
		verify(fileStorage).delete(first.getId());
		verify(fileStorage).delete(second.getId());
	}

	@Test
	void purgeExpiredFiles_keepsTheRecords() {
		// GIVEN
		when(sharedFileRepository.findByExpiresAtBefore(any())).thenReturn(List.of(fileWithId()));

		// WHEN
		filePurgeService.purgeExpiredFiles();

		// THEN: the repository is only read, no record is deleted or changed
		verify(sharedFileRepository).findByExpiresAtBefore(any());
		verifyNoMoreInteractions(sharedFileRepository);
	}

	@Test
	void purgeExpiredFiles_diskFailure_goesOnWithTheNextFiles() {
		// GIVEN
		SharedFile failing = fileWithId();
		SharedFile next = fileWithId();
		when(sharedFileRepository.findByExpiresAtBefore(any())).thenReturn(List.of(failing, next));
		doThrow(new UncheckedIOException(new IOException("disk error"))).when(fileStorage).delete(failing.getId());

		// WHEN
		filePurgeService.purgeExpiredFiles();

		// THEN
		verify(fileStorage).delete(next.getId());
	}

	// The purge only reads the id: the other fields do not matter here
	private SharedFile fileWithId() {
		SharedFile file = new SharedFile();
		file.setId(UUID.randomUUID());
		return file;
	}

}
