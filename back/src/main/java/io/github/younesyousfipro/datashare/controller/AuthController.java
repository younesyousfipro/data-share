package io.github.younesyousfipro.datashare.controller;

import io.github.younesyousfipro.datashare.dto.LoginRequestDTO;
import io.github.younesyousfipro.datashare.dto.LoginResponseDTO;
import io.github.younesyousfipro.datashare.dto.RegisterRequestDTO;
import io.github.younesyousfipro.datashare.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

	private final AuthService authService;

	@PostMapping("/register")
	@ResponseStatus(HttpStatus.CREATED)
	public void register(@Valid @RequestBody RegisterRequestDTO request) {
		authService.register(request);
	}

	@PostMapping("/login")
	public LoginResponseDTO login(@Valid @RequestBody LoginRequestDTO request) {
		return authService.login(request);
	}

}
