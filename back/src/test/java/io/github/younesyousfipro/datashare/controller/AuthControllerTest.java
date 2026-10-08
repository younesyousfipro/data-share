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

	private static final String URL = "/api/auth/register";
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
				.andExpect(jsonPath("$.details").value("uri=" + URL))
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
		mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("{\"email\":"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").exists())
				.andExpect(jsonPath("$.details").value("uri=" + URL));
	}

	private ResultActions register(String email, String password) throws Exception {
		String body = """
				{"email": "%s", "password": "%s"}
				""".formatted(email, password);
		return mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(body));
	}

}
