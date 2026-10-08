package io.github.younesyousfipro.datashare.service;

import io.github.younesyousfipro.datashare.dto.RegisterRequestDTO;
import io.github.younesyousfipro.datashare.exception.EmailAlreadyUsedException;
import io.github.younesyousfipro.datashare.model.Account;
import io.github.younesyousfipro.datashare.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

	private final AccountRepository accountRepository;
	private final PasswordEncoder passwordEncoder;

	public void register(RegisterRequestDTO request) {
		String email = normalizeEmail(request.email());
		if (accountRepository.existsByEmail(email)) {
			throw new EmailAlreadyUsedException();
		}

		Account account = new Account();
		account.setEmail(email);
		account.setPasswordHash(passwordEncoder.encode(request.password()));

		try {
			accountRepository.saveAndFlush(account);
		} catch (DataIntegrityViolationException e) {
			// Same email registered concurrently: the unique constraint rejected the second one
			throw new EmailAlreadyUsedException();
		}
	}

	// Locale.ROOT: same result whatever the server language
	private String normalizeEmail(String email) {
		return email.toLowerCase(Locale.ROOT);
	}

}
