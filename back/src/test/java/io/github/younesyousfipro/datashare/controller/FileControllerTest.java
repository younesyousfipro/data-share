package io.github.younesyousfipro.datashare.controller;

import io.github.younesyousfipro.datashare.TestcontainersConfiguration;
import io.github.younesyousfipro.datashare.model.Account;
import io.github.younesyousfipro.datashare.model.SharedFile;
import io.github.younesyousfipro.datashare.repository.AccountRepository;
import io.github.younesyousfipro.datashare.repository.SharedFileRepository;
import io.github.younesyousfipro.datashare.service.JwtService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class FileControllerTest {

	private static final String FILES_URL = "/api/files";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private AccountRepository accountRepository;

	@Autowired
	private SharedFileRepository sharedFileRepository;

	@Autowired
	private JwtService jwtService;

	@Autowired
	private JwtEncoder jwtEncoder;

	@Value("${datashare.storage.directory}")
	private String storageDirectory;

	private Account account;

	private String token;

	@BeforeEach
	void setUp() {
		sharedFileRepository.deleteAll();
		accountRepository.deleteAll();
		account = new Account();
		account.setEmail("marie@mail.fr");
		account.setPasswordHash("$2a$10$hash");
		account = accountRepository.save(account);
		token = jwtService.generateToken(account);
	}

	// Test classes share the database: AuthControllerTest deletes accounts, which a remaining file would block
	@AfterEach
	void tearDown() {
		sharedFileRepository.deleteAll();
	}

	@Test
	void upload_returns201AndStoresFileOnDiskAndInDatabase() throws Exception {
		// WHEN
		ResultActions result = mockMvc.perform(uploadRequest("vacances.mp4")
				.param("password", "s3cret")
				.param("expirationDays", "3")
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token));

		// THEN: the response is the owner's view, without hash nor account id
		result.andExpect(status().isCreated())
				.andExpect(jsonPath("$.originalName").value("vacances.mp4"))
				.andExpect(jsonPath("$.sizeBytes").value(5))
				.andExpect(jsonPath("$.status").value("ACTIVE"))
				.andExpect(jsonPath("$.passwordProtected").value(true))
				.andExpect(jsonPath("$.passwordHash").doesNotExist())
				.andExpect(jsonPath("$.accountId").doesNotExist());

		SharedFile saved = sharedFileRepository.findAll().getFirst();
		assertThat(saved.getAccountId()).isEqualTo(account.getId());
		assertThat(Duration.between(saved.getUploadedAt(), saved.getExpiresAt())).isEqualTo(Duration.ofDays(3));
		assertThat(Path.of(storageDirectory, saved.getId().toString())).hasContent("hello");
	}

	@Test
	void upload_returns401WithoutToken() throws Exception {
		mockMvc.perform(uploadRequest("vacances.mp4"))
				.andExpect(status().isUnauthorized())
				.andExpect(header().exists(HttpHeaders.WWW_AUTHENTICATE));
		assertThat(sharedFileRepository.count()).isZero();
	}

	@Test
	void upload_returns401WithForgedToken() throws Exception {
		mockMvc.perform(uploadRequest("vacances.mp4")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token + "x"))
				.andExpect(status().isUnauthorized())
				.andExpect(header().exists(HttpHeaders.WWW_AUTHENTICATE));
	}

	@Test
	void upload_returns401WithExpiredToken() throws Exception {
		mockMvc.perform(uploadRequest("vacances.mp4")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + expiredToken()))
				.andExpect(status().isUnauthorized())
				.andExpect(header().exists(HttpHeaders.WWW_AUTHENTICATE));
	}

	@Test
	void upload_returns400ForForbiddenExtensionAndStoresNothing() throws Exception {
		mockMvc.perform(uploadRequest("invoice.pdf.exe")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("This file type is not allowed"));
		assertThat(sharedFileRepository.count()).isZero();
	}

	@Test
	void upload_returns400WithoutEchoingTooShortPassword() throws Exception {
		mockMvc.perform(uploadRequest("vacances.mp4")
						.param("password", "12345")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value(containsString("password")))
				.andExpect(jsonPath("$.message").value(not(containsString("12345"))));
	}

	@Test
	void upload_returns400WhenExpirationIsOutOfRange() throws Exception {
		mockMvc.perform(uploadRequest("vacances.mp4")
						.param("expirationDays", "8")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value(containsString("expirationDays")));
	}

	@Test
	void upload_returns400WhenFileIsMissing() throws Exception {
		mockMvc.perform(multipart(FILES_URL)
						.param("expirationDays", "3")
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value(containsString("file")));
	}

	private MockMultipartHttpServletRequestBuilder uploadRequest(String fileName) {
		MockMultipartFile file = new MockMultipartFile("file", fileName, "application/octet-stream",
				"hello".getBytes(StandardCharsets.UTF_8));
		return multipart(FILES_URL).file(file);
	}

	// Validly signed, but expired one hour ago (beyond the decoder's 60 s clock tolerance)
	private String expiredToken() {
		Instant now = Instant.now();
		JwtClaimsSet claims = JwtClaimsSet.builder()
				.subject(account.getId().toString())
				.issuedAt(now.minus(Duration.ofHours(2)))
				.expiresAt(now.minus(Duration.ofHours(1)))
				.build();
		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
	}

}
