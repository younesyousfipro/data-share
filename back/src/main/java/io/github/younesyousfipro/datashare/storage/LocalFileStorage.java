package io.github.younesyousfipro.datashare.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Component
public class LocalFileStorage implements FileStorage {

	private final Path directory;

	// Fails at startup if the directory cannot be created, rather than at the first upload
	public LocalFileStorage(@Value("${datashare.storage.directory}") String directory) throws IOException {
		this.directory = Files.createDirectories(Path.of(directory));
	}

	// Copied chunk by chunk, never loaded whole in memory. Fails if the file already exists: never overwrites
	@Override
	public void store(UUID id, InputStream content) {
		try {
			Files.copy(content, pathOf(id));
		} catch (IOException e) {
			throw new UncheckedIOException(e);
		}
	}

	// No error if the file is already gone: the purge can run twice
	@Override
	public void delete(UUID id) {
		try {
			Files.deleteIfExists(pathOf(id));
		} catch (IOException e) {
			throw new UncheckedIOException(e);
		}
	}

	// Named by the UUID only: the original name never reaches the file system (no "../" path traversal)
	private Path pathOf(UUID id) {
		return directory.resolve(id.toString());
	}

}
