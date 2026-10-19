package io.github.younesyousfipro.datashare.service;

import io.github.younesyousfipro.datashare.model.SharedFile;
import io.github.younesyousfipro.datashare.repository.SharedFileRepository;
import io.github.younesyousfipro.datashare.storage.FileStorage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.UncheckedIOException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FilePurgeService {

	private final SharedFileRepository sharedFileRepository;
	private final FileStorage fileStorage;

	// Disk only: the record is kept, so the history still lists the file as expired.
	// Files purged on a previous run come back each time; deleting them again does nothing
	@Scheduled(cron = "${datashare.purge.cron}")
	public void purgeExpiredFiles() {
		List<SharedFile> expiredFiles = sharedFileRepository.findByExpiresAtBefore(Instant.now());
		for (SharedFile file : expiredFiles) {
			deleteFromDisk(file.getId());
		}
		log.atInfo()
				.addKeyValue("action", "purge")
				.addKeyValue("expiredFiles", expiredFiles.size())
				.log("Purge: {} expired files checked", expiredFiles.size());
	}

	// One failure does not stop the purge: the record stays, so the file is retried on the next run
	private void deleteFromDisk(UUID id) {
		try {
			fileStorage.delete(id);
		} catch (UncheckedIOException e) {
			log.atWarn()
					.addKeyValue("action", "purge")
					.addKeyValue("fileId", id.toString())
					.setCause(e)
					.log("Expired file {} could not be deleted from disk", id);
		}
	}

}
