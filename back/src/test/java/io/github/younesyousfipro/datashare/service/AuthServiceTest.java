package io.github.younesyousfipro.datashare.service;

import io.github.younesyousfipro.datashare.dto.LoginRequestDTO;
import io.github.younesyousfipro.datashare.dto.RegisterRequestDTO;
import io.github.younesyousfipro.datashare.exception.EmailAlreadyUsedException;
import io.github.younesyousfipro.datashare.exception.InvalidCredentialsException;
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

import java.util.Optional;

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

	@Mock
	private JwtService jwtService;

	// Real encoder: pure computation without I/O, a mock would isolate from nothing
	private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

	private AuthService authService;

	@BeforeEach
	void setUp() {
		authService = new AuthService(accountRepository, passwordEncoder, jwtService);
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

	@Test
	void login_returnsTokenWhenCredentialsMatchWhateverTheEmailCase() {
		// GIVEN
		Account account = accountWithPassword(PASSWORD);
		when(accountRepository.findByEmail(EMAIL)).thenReturn(Optional.of(account));
		when(jwtService.generateToken(account)).thenReturn("signed-token");

		// WHEN
		String token = authService.login(new LoginRequestDTO("Marie@Mail.FR", PASSWORD)).token();

		// THEN
		assertThat(token).isEqualTo("signed-token");
	}

	@Test
	void login_rejectsUnknownEmail() {
		// GIVEN
		when(accountRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

		// WHEN / THEN
		assertThatThrownBy(() -> authService.login(new LoginRequestDTO(EMAIL, PASSWORD)))
				.isInstanceOf(InvalidCredentialsException.class);
		verify(jwtService, never()).generateToken(any());
	}

	@Test
	void login_rejectsWrongPassword() {
		// GIVEN
		when(accountRepository.findByEmail(EMAIL)).thenReturn(Optional.of(accountWithPassword(PASSWORD)));

		// WHEN / THEN
		assertThatThrownBy(() -> authService.login(new LoginRequestDTO(EMAIL, "wrongPass")))
				.isInstanceOf(InvalidCredentialsException.class);
		verify(jwtService, never()).generateToken(any());
	}

	private Account accountWithPassword(String password) {
		Account account = new Account();
		account.setEmail(EMAIL);
		account.setPasswordHash(passwordEncoder.encode(password));
		return account;
	}

}
