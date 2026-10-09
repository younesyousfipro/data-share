package io.github.younesyousfipro.datashare.service;

import io.github.younesyousfipro.datashare.model.Account;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class JwtService {

	private static final Duration VALIDITY = Duration.ofHours(1);

	private final JwtEncoder jwtEncoder;

	public String generateToken(Account account) {
		Instant now = Instant.now();
		JwtClaimsSet claims = JwtClaimsSet.builder()
				.subject(account.getId().toString())
				.issuedAt(now)
				.expiresAt(now.plus(VALIDITY))
				.build();
		// The encoder defaults to RS256 (key pair); HS256 must be named to use the secret key
		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
	}

}
