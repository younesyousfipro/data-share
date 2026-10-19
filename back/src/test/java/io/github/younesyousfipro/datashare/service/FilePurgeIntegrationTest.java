package io.github.younesyousfipro.datashare.service;

import io.github.younesyousfipro.datashare.TestcontainersConfiguration;
import io.github.younesyousfipro.datashare.model.Account;
import io.github.younesyousfipro.datashare.model.SharedFile;
import io.github.younesyousfipro.datashare.repository.AccountRepository;
import io.github.younesyousfipro.datashare.repository.SharedFileRepository;
import io.github.younesyousfipro.datashare.storage.FileStorage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.scheduling.config.CronTask;
import org.springframework.scheduling.config.ScheduledTask;
import org.springframework.scheduling.config.ScheduledTaskHolder;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

// Real database and real storage directory: checks the query and the disk that the unit test mocks
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class FilePurgeIntegrationTest {

	@Autowired
	private FilePurgeService filePurgeService;

	@Autowired
	private AccountRepository accountRepository;

	@Autowired
	private SharedFileRepository sharedFileRepository;

	@Autowired
	private FileStorage fileStorage;

	// Filled by @EnableScheduling with every @Scheduled method found at startup
	@Autowired
	private ScheduledTaskHolder scheduledTaskHolder;

	@Value("${datashare.storage.directory}")
	private String storageDirectory;

	private Account account;

	@BeforeEach
	void setUp() {
		sharedFileRepository.deleteAll();
		accountRepository.deleteAll();
		account = new Account();
		account.setEmail("marie@mail.fr");
		account.setPasswordHash("$2a$10$hash");
		account = accountRepository.save(account);
	}

	// Test classes share the database: AuthControllerTest deletes accounts, which a remaining file would block
	@AfterEach
	void tearDown() {
		sharedFileRepository.findAll().forEach(file -> fileStorage.delete(file.getId()));
		sharedFileRepository.deleteAll();
	}

	@Test
	void purge_isScheduledEveryHour() {
		// WHEN
		List<String> cronExpressions = scheduledTaskHolder.getScheduledTasks().stream()
				.map(ScheduledTask::getTask)
				.filter(CronTask.class::isInstance)
				.map(task -> ((CronTask) task).getExpression())
				.toList();

		// THEN: the purge is the only scheduled task of the application
		assertThat(cronExpressions).containsExactly("0 0 * * * *");
	}

	@Test
	void purgeExpiredFiles_deletesOnlyExpiredFilesAndKeepsAllRecords() {
		// GIVEN
		SharedFile expired = storedFile(Duration.ofHours(-1));
		SharedFile active = storedFile(Duration.ofDays(3));
		assertThat(fileOnDisk(expired)).exists();

		// WHEN
		filePurgeService.purgeExpiredFiles();

		// THEN
		assertThat(fileOnDisk(expired)).doesNotExist();
		assertThat(fileOnDisk(active)).exists();
		assertThat(sharedFileRepository.findAll())
				.extracting(SharedFile::getId)
				.containsExactlyInAnyOrder(expired.getId(), active.getId());
	}

	// A negative duration makes it expired
	private SharedFile storedFile(Duration timeLeft) {
		Instant now = Instant.now();
		SharedFile file = new SharedFile();
		file.setId(UUID.randomUUID());
		file.setAccountId(account.getId());
		file.setOriginalName("vacances.mp4");
		file.setSizeBytes(5);
		file.setUploadedAt(now.minus(Duration.ofDays(1)));
		file.setExpiresAt(now.plus(timeLeft));
		fileStorage.store(file.getId(), new ByteArrayInputStream("hello".getBytes(StandardCharsets.UTF_8)));
		return sharedFileRepository.save(file);
	}

	// Same naming as LocalFileStorage: the UUID is the file name
	private Path fileOnDisk(SharedFile file) {
		return Path.of(storageDirectory, file.getId().toString());
	}

}
