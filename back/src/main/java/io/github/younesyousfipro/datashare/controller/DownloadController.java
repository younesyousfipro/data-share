package io.github.younesyousfipro.datashare.controller;

import io.github.younesyousfipro.datashare.dto.DownloadRequestDTO;
import io.github.younesyousfipro.datashare.dto.FileContentDTO;
import io.github.younesyousfipro.datashare.dto.FileMetadataResponseDTO;
import io.github.younesyousfipro.datashare.service.FileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

// Public routes: owning the link is enough, no JWT
@RestController
@RequestMapping("/api/download")
@RequiredArgsConstructor
public class DownloadController {

	private final FileService fileService;

	@GetMapping("/{id}")
	public FileMetadataResponseDTO getMetadata(@PathVariable UUID id) {
		return fileService.getMetadata(id);
	}

	// POST, not GET: the password travels in the body, never in the URL (server logs, browser history)
	@PostMapping("/{id}")
	public ResponseEntity<InputStreamResource> download(@PathVariable UUID id,
			@Valid @RequestBody(required = false) DownloadRequestDTO request) {
		// The body may be omitted for an unprotected file
		String password = request == null ? null : request.password();
		FileContentDTO file = fileService.download(id, password);

		// UTF-8 so that names like "rapport été.pdf" reach the browser intact
		ContentDisposition disposition = ContentDisposition.attachment()
				.filename(file.originalName(), StandardCharsets.UTF_8)
				.build();
		// Always octet-stream: the browser saves the file and never renders it
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
				.contentType(MediaType.APPLICATION_OCTET_STREAM)
				.contentLength(file.sizeBytes())
				.body(new InputStreamResource(file.content()));
	}

}
