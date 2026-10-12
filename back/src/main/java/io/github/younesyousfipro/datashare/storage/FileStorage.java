package io.github.younesyousfipro.datashare.storage;

import java.io.InputStream;
import java.util.UUID;

// Where the bytes are kept is hidden here: switching to object storage only adds an implementation
public interface FileStorage {

	void store(UUID id, InputStream content);

	void delete(UUID id);

}
