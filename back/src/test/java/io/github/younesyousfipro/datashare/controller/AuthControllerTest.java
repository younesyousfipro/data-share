package io.github.younesyousfipro.datashare.controller;

import io.github.younesyousfipro.datashare.TestcontainersConfiguration;
import io.github.younesyousfipro.datashare.model.Account;
import io.github.younesyousfipro.datashare.repository.AccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AuthControllerTest {

	private static final String REGISTER_URL = "/api/auth/register";
	private static final String LOGIN_URL = "/api/auth/login";
	private static final String EMAIL = "marie@mail.fr";
	private static final String PASSWORD = "s3cretPass";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private AccountRepository accountRepository;

	@BeforeEach
	void setUp() {
		accountRepository.deleteAll();
	}

	@Test
	void register_returns201AndStoresHashedPassword() throws Exception {
		// WHEN
		register(EMAIL, PASSWORD)
				// THEN
				.andExpect(status().isCreated());

		Account saved = accountRepository.findAll().getFirst();
		assertThat(saved.getEmail()).isEqualTo(EMAIL);
		assertThat(saved.getPasswordHash()).isNotEqualTo(PASSWORD).startsWith("$2a$");
	}

	@Test
	void register_returns409WhenEmailAlreadyUsedWhateverTheCase() throws Exception {
		// GIVEN
		register(EMAIL, PASSWORD);

		// WHEN
		register("MARIE@mail.fr", PASSWORD)
				// THEN
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("This email is already used"))
				.andExpect(jsonPath("$.details").value("uri=" + REGISTER_URL))
				.andExpect(jsonPath("$.timestamp").exists());
	}

	@Test
	void register_returns400WhenEmailIsInvalid() throws Exception {
		register("not-an-email", PASSWORD)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value(containsString("email")));
	}

	@Test
	void register_returns400WhenEmailHasSurroundingSpaces() throws Exception {
		register(" " + EMAIL + " ", PASSWORD)
				.andExpect(status().isBadRequest());
	}

	@Test
	void register_returns400WithoutEchoingTheRejectedPassword() throws Exception {
		register(EMAIL, "1234567")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value(containsString("password")))
				.andExpect(jsonPath("$.message").value(not(containsString("1234567"))));
	}

	@Test
	void register_returns400WhenPasswordExceeds18Characters() throws Exception {
		register(EMAIL, "a".repeat(19))
				.andExpect(status().isBadRequest());
	}

	@Test
	void register_returns400InSameFormatWhenJsonIsMalformed() throws Exception {
		mockMvc.perform(post(REGISTER_URL).contentType(MediaType.APPLICATION_JSON).content("{\"email\":"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").exists())
				.andExpect(jsonPath("$.details").value("uri=" + REGISTER_URL));
	}

	@Test
	void login_returns200WithTokenWhateverTheEmailCase() throws Exception {
		// GIVEN
		register(EMAIL, PASSWORD);

		// WHEN
		login("Marie@Mail.FR", PASSWORD)
				// THEN
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.token").isNotEmpty());
	}

	@Test
	void login_returns401WithSameMessageForUnknownEmailAndWrongPassword() throws Exception {
		// GIVEN
		register(EMAIL, PASSWORD);
		String message = "Invalid email or password";

		// WHEN / THEN
		login("unknown@mail.fr", PASSWORD)
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.message").value(message))
				.andExpect(jsonPath("$.details").value("uri=" + LOGIN_URL));
		login(EMAIL, "wrongPass")
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.message").value(message));
	}

	// BCrypt only reads 72 bytes: the encoder must answer "no match", not fail with a 500
	@Test
	void login_returns401WhenPasswordExceeds72Bytes() throws Exception {
		// GIVEN
		register(EMAIL, PASSWORD);

		// WHEN / THEN
		login(EMAIL, "a".repeat(100))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void login_returns400WhenEmailIsInvalid() throws Exception {
		login("not-an-email", PASSWORD)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value(containsString("email")));
	}

	private ResultActions register(String email, String password) throws Exception {
		return postCredentials(REGISTER_URL, email, password);
	}

	private ResultActions login(String email, String password) throws Exception {
		return postCredentials(LOGIN_URL, email, password);
	}

	private ResultActions postCredentials(String url, String email, String password) throws Exception {
		String body = """
				{"email": "%s", "password": "%s"}
				""".formatted(email, password);
		return mockMvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(body));
	}

}
