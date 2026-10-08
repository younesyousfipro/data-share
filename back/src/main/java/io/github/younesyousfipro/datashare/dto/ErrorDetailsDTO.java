package io.github.younesyousfipro.datashare.dto;

import java.time.LocalDateTime;

public record ErrorDetailsDTO(LocalDateTime timestamp, String message, String details) {
}
