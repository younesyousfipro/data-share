package io.github.younesyousfipro.datashare.configuration;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

// springdoc does not read Spring Security: the JWT scheme is declared here, under the same name as in
// openapi.yaml, and the protected controllers refer to it with @SecurityRequirement.
// The version is the one of the API contract, not of the Maven artifact
@Configuration
@OpenAPIDefinition(info = @Info(title = "DataShare API", version = "0.1.0"))
@SecurityScheme(name = "bearerAuth", type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT")
public class OpenApiConfig {
}
