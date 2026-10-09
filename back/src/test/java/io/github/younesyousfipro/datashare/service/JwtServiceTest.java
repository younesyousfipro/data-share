package io.github.younesyousfipro.datashare.service;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import io.github.younesyousfipro.datashare.model.Account;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

	private final SecretKeySpec key = new SecretKeySpec(
			"test-only-secret-key-of-at-least-32-bytes".getBytes(StandardCharsets.UTF_8), "HmacSHA256");

	// Real encoder and decoder: the test proves the token can be read back with the same key
	private final JwtService jwtService = new JwtService(new NimbusJwtEncoder(new ImmutableSecret<>(key)));
	private final JwtDecoder jwtDecoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();

	@Test
	void generateToken_carriesAccountIdAndExpiresAfterOneHour() {
		// GIVEN
		Account account = new Account();
		account.setId(42L);

		// WHEN
		Jwt jwt = jwtDecoder.decode(jwtService.generateToken(account));

		// THEN
		assertThat(jwt.getSubject()).isEqualTo("42");
		assertThat(Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt())).isEqualTo(Duration.ofHours(1));
	}

}
