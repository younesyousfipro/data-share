package io.github.younesyousfipro.datashare.dto;

// Computed from expiresAt, never stored
public enum FileStatus {
	ACTIVE,
	EXPIRING_SOON,
	EXPIRED
}
