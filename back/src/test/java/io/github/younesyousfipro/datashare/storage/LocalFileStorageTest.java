package io.github.younesyousfipro.datashare.storage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LocalFileStorageTest {

	private static final UUID ID = UUID.fromString("3f2b9c1e-8d4a-4c3b-9f1e-2a6b7c8da7d4");

	// Fresh empty directory for each test, deleted afterwards by JUnit
	@TempDir
	private Path tempDir;

	private Path storageDir;

	private LocalFileStorage storage;

	@BeforeEach
	void setUp() throws IOException {
		storageDir = tempDir.resolve("uploads");
		storage = new LocalFileStorage(storageDir.toString());
	}

	@Test
	void constructor_createsMissingDirectory() {
		assertThat(storageDir).isDirectory();
	}

	@Test
	void store_writesContentUnderUuid() {
		// WHEN
		storage.store(ID, content("hello"));

		// THEN
		assertThat(storageDir.resolve(ID.toString())).hasContent("hello");
	}

	@Test
	void store_existingId_throwsAndKeepsFirstFile() {
		// GIVEN
		storage.store(ID, content("first"));

		// WHEN / THEN
		assertThatThrownBy(() -> storage.store(ID, content("second")))
				.isInstanceOf(UncheckedIOException.class);
		assertThat(storageDir.resolve(ID.toString())).hasContent("first");
	}

	@Test
	void delete_removesFile() {
		// GIVEN
		storage.store(ID, content("hello"));

		// WHEN
		storage.delete(ID);

		// THEN
		assertThat(storageDir.resolve(ID.toString())).doesNotExist();
	}

	@Test
	void delete_missingFile_doesNothing() {
		assertThatCode(() -> storage.delete(ID)).doesNotThrowAnyException();
	}

	@Test
	void store_unwritableDirectory_throws() throws IOException {
		// GIVEN: the storage directory has been removed and replaced by a plain file
		Files.delete(storageDir);
		Files.createFile(storageDir);

		// WHEN / THEN
		assertThatThrownBy(() -> storage.store(ID, content("hello")))
				.isInstanceOf(UncheckedIOException.class);
	}

	private InputStream content(String text) {
		return new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8));
	}

}
