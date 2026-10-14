package io.github.younesyousfipro.datashare.controller;

import io.github.younesyousfipro.datashare.TestcontainersConfiguration;
import io.github.younesyousfipro.datashare.model.Account;
import io.github.younesyousfipro.datashare.model.SharedFile;
import io.github.younesyousfipro.datashare.repository.AccountRepository;
import io.github.younesyousfipro.datashare.repository.SharedFileRepository;
import io.github.younesyousfipro.datashare.storage.FileStorage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// No request carries a JWT: these routes are public
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class DownloadControllerTest {

	private static final String DOWNLOAD_URL = "/api/download/";
	private static final String FILE_PASSWORD = "s3cret";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private AccountRepository accountRepository;

	@Autowired
	private SharedFileRepository sharedFileRepository;

	@Autowired
	private FileStorage fileStorage;

	@Autowired
	private PasswordEncoder passwordEncoder;

	private Account account;

	@BeforeEach
	void setUp() {
		sharedFileRepository.deleteAll();
		accountRepository.deleteAll();
		account = new Account();
		account.setEmail("marie@mail.fr");
		account.setPasswordHash("$2a$10$hash");
		account = accountRepository.save(account);
	}

	// Test classes share the database: AuthControllerTest deletes accounts, which a remaining file would block
	@AfterEach
	void tearDown() {
		sharedFileRepository.findAll().forEach(file -> fileStorage.delete(file.getId()));
		sharedFileRepository.deleteAll();
	}

	@Test
	void getMetadata_returns200WithPublicFieldsOnly() throws Exception {
		// GIVEN
		SharedFile file = storedFile("vacances.mp4", Duration.ofDays(3), FILE_PASSWORD);

		// WHEN / THEN: no id, upload date, owner nor hash in a public response
		mockMvc.perform(get(DOWNLOAD_URL + file.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.originalName").value("vacances.mp4"))
				.andExpect(jsonPath("$.sizeBytes").value(5))
				.andExpect(jsonPath("$.expiresAt").exists())
				.andExpect(jsonPath("$.passwordProtected").value(true))
				.andExpect(jsonPath("$.id").doesNotExist())
				.andExpect(jsonPath("$.uploadedAt").doesNotExist())
				.andExpect(jsonPath("$.accountId").doesNotExist())
				.andExpect(jsonPath("$.passwordHash").doesNotExist());
	}

	@Test
	void getMetadata_returns404ForUnknownFile() throws Exception {
		mockMvc.perform(get(DOWNLOAD_URL + UUID.randomUUID()))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("File not found"));
	}

	@Test
	void getMetadata_returns410ForExpiredFile() throws Exception {
		SharedFile file = storedFile("vacances.mp4", Duration.ofHours(-1), null);

		mockMvc.perform(get(DOWNLOAD_URL + file.getId()))
				.andExpect(status().isGone())
				.andExpect(jsonPath("$.message").value("This file has expired"));
	}

	@Test
	void getMetadata_returns400ForMalformedId() throws Exception {
		mockMvc.perform(get(DOWNLOAD_URL + "not-a-uuid"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").exists());
	}

	@Test
	void download_unprotectedFileWithoutBody_returnsContentAsAttachment() throws Exception {
		// GIVEN
		SharedFile file = storedFile("vacances.mp4", Duration.ofDays(3), null);

		// WHEN / THEN
		mockMvc.perform(post(DOWNLOAD_URL + file.getId()))
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.APPLICATION_OCTET_STREAM))
				.andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("attachment")))
				.andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("vacances.mp4")))
				.andExpect(header().longValue(HttpHeaders.CONTENT_LENGTH, 5))
				// Added by Spring Security: the browser never guesses another type from the content
				.andExpect(header().string("X-Content-Type-Options", "nosniff"))
				.andExpect(content().string("hello"));
	}

	@Test
	void download_protectedFileWithRightPassword_returnsContent() throws Exception {
		SharedFile file = storedFile("vacances.mp4", Duration.ofDays(3), FILE_PASSWORD);

		mockMvc.perform(withPassword(post(DOWNLOAD_URL + file.getId()), FILE_PASSWORD))
				.andExpect(status().isOk())
				.andExpect(content().string("hello"));
	}

	@Test
	void download_protectedFileWithWrongPassword_returns403() throws Exception {
		SharedFile file = storedFile("vacances.mp4", Duration.ofDays(3), FILE_PASSWORD);

		mockMvc.perform(withPassword(post(DOWNLOAD_URL + file.getId()), "wrong1"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.message").value("Missing or wrong file password"));
	}

	@Test
	void download_protectedFileWithoutBody_returns403() throws Exception {
		SharedFile file = storedFile("vacances.mp4", Duration.ofDays(3), FILE_PASSWORD);

		mockMvc.perform(post(DOWNLOAD_URL + file.getId()))
				.andExpect(status().isForbidden());
	}

	@Test
	void download_returns410ForExpiredFile() throws Exception {
		SharedFile file = storedFile("vacances.mp4", Duration.ofHours(-1), null);

		mockMvc.perform(post(DOWNLOAD_URL + file.getId()))
				.andExpect(status().isGone());
	}

	@Test
	void download_returns404ForUnknownFile() throws Exception {
		mockMvc.perform(post(DOWNLOAD_URL + UUID.randomUUID()))
				.andExpect(status().isNotFound());
	}

	@Test
	void download_returns400WithoutEchoingTooLongPassword() throws Exception {
		SharedFile file = storedFile("vacances.mp4", Duration.ofDays(3), FILE_PASSWORD);
		String tooLong = "p".repeat(19);

		mockMvc.perform(withPassword(post(DOWNLOAD_URL + file.getId()), tooLong))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value(containsString("password")))
				.andExpect(jsonPath("$.message").value(not(containsString(tooLong))));
	}

	// RFC 5987 encoding: UTF-8 bytes, percent-encoded
	@Test
	void download_nonAsciiName_isEncodedInHeader() throws Exception {
		SharedFile file = storedFile("rapport été.pdf", Duration.ofDays(3), null);

		mockMvc.perform(post(DOWNLOAD_URL + file.getId()))
				.andExpect(status().isOk())
				.andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
						containsString("filename*=UTF-8''rapport%20%C3%A9t%C3%A9.pdf")));
	}

	// Row in the database and content "hello" on disk; a negative duration makes it expired
	private SharedFile storedFile(String name, Duration timeLeft, String password) {
		Instant now = Instant.now();
		SharedFile file = new SharedFile();
		file.setId(UUID.randomUUID());
		file.setAccountId(account.getId());
		file.setOriginalName(name);
		file.setSizeBytes(5);
		file.setUploadedAt(now.minus(Duration.ofDays(1)));
		file.setExpiresAt(now.plus(timeLeft));
		if (password != null) {
			file.setPasswordHash(passwordEncoder.encode(password));
		}
		fileStorage.store(file.getId(), new ByteArrayInputStream("hello".getBytes(StandardCharsets.UTF_8)));
		return sharedFileRepository.save(file);
	}

	private MockHttpServletRequestBuilder withPassword(MockHttpServletRequestBuilder request, String password) {
		return request.contentType(MediaType.APPLICATION_JSON).content("{\"password\": \"" + password + "\"}");
	}

}
