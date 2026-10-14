package io.github.younesyousfipro.datashare.dto;

import java.io.InputStream;

// From the service to the controller only, never serialized: the controller turns it into the HTTP response
public record FileContentDTO(String originalName, long sizeBytes, InputStream content) {
}
