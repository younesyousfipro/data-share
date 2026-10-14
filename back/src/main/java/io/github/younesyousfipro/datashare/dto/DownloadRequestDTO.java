package io.github.younesyousfipro.datashare.dto;

import jakarta.validation.constraints.Size;

// Optional password; longer than 18 characters it cannot match, the upload never accepts it
public record DownloadRequestDTO(@Size(max = 18) String password) {
}
