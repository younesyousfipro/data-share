package io.github.younesyousfipro.datashare.dto;

import java.time.Instant;

public record ErrorDetailsDTO(Instant timestamp, String message, String details) {
}
