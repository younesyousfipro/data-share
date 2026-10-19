package io.github.younesyousfipro.datashare.configuration;

import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

// springdoc does not read Spring Security: the JWT scheme is declared here, under the same name as in
// openapi.yaml, and the protected controllers refer to it with @SecurityRequirement
@Configuration
@SecurityScheme(name = "bearerAuth", type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT")
public class OpenApiConfig {
}
