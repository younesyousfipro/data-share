package io.github.younesyousfipro.datashare.controller;

import io.github.younesyousfipro.datashare.dto.FileResponseDTO;
import io.github.younesyousfipro.datashare.dto.UploadRequestDTO;
import io.github.younesyousfipro.datashare.service.FileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

	private final FileService fileService;

	// The owner comes from the verified token, never from the request
	@GetMapping
	public List<FileResponseDTO> listMyFiles(@AuthenticationPrincipal Jwt jwt) {
		return fileService.listOwnedBy(Long.valueOf(jwt.getSubject()));
	}

	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	public FileResponseDTO upload(@Valid @ModelAttribute UploadRequestDTO request, @AuthenticationPrincipal Jwt jwt) {
		return fileService.upload(request, Long.valueOf(jwt.getSubject()));
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
		fileService.delete(id, Long.valueOf(jwt.getSubject()));
	}

}
