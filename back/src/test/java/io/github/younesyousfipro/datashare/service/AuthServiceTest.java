package io.github.younesyousfipro.datashare.service;

import io.github.younesyousfipro.datashare.dto.RegisterRequestDTO;
import io.github.younesyousfipro.datashare.exception.EmailAlreadyUsedException;
import io.github.younesyousfipro.datashare.model.Account;
import io.github.younesyousfipro.datashare.repository.AccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

	private static final String EMAIL = "marie@mail.fr";
	private static final String PASSWORD = "s3cretPass";

	@Mock
	private AccountRepository accountRepository;

	// Real encoder: pure computation without I/O, a mock would isolate from nothing
	private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

	private AuthService authService;

	@BeforeEach
	void setUp() {
		authService = new AuthService(accountRepository, passwordEncoder);
	}

	@Test
	void register_savesLowerCaseEmailAndHashedPassword() {
		// GIVEN
		when(accountRepository.existsByEmail(EMAIL)).thenReturn(false);

		// WHEN
		authService.register(new RegisterRequestDTO("Marie@Mail.FR", PASSWORD));

		// THEN
		ArgumentCaptor<Account> saved = ArgumentCaptor.forClass(Account.class);
		verify(accountRepository).saveAndFlush(saved.capture());
		assertThat(saved.getValue().getEmail()).isEqualTo(EMAIL);
		assertThat(saved.getValue().getPasswordHash()).isNotEqualTo(PASSWORD);
		assertThat(passwordEncoder.matches(PASSWORD, saved.getValue().getPasswordHash())).isTrue();
	}

	@Test
	void register_rejectsEmailAlreadyUsed() {
		// GIVEN
		when(accountRepository.existsByEmail(EMAIL)).thenReturn(true);

		// WHEN / THEN
		assertThatThrownBy(() -> authService.register(new RegisterRequestDTO(EMAIL, PASSWORD)))
				.isInstanceOf(EmailAlreadyUsedException.class);
		verify(accountRepository, never()).saveAndFlush(any());
	}

	@Test
	void register_rejectsEmailTakenByConcurrentRegistration() {
		// GIVEN
		when(accountRepository.existsByEmail(EMAIL)).thenReturn(false);
		when(accountRepository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("uk_account_email"));

		// WHEN / THEN
		assertThatThrownBy(() -> authService.register(new RegisterRequestDTO(EMAIL, PASSWORD)))
				.isInstanceOf(EmailAlreadyUsedException.class);
	}

}
