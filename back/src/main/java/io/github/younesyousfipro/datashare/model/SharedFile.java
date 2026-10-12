package io.github.younesyousfipro.datashare.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

// Constraints (foreign key, not null, expiry after upload) live in the Flyway schema, not here
@Entity
@Getter
@Setter
@NoArgsConstructor
public class SharedFile {

	// Set by the service, not the database: the file is written to disk under this name before the insert
	@Id
	@Column(name = "file_id")
	private UUID id;

	// Plain id, no @ManyToOne: the code never navigates from a file to its account
	private Long accountId;

	private String originalName;

	private long sizeBytes;

	// Null when the file is not password protected
	private String passwordHash;

	private Instant uploadedAt;

	private Instant expiresAt;

}
