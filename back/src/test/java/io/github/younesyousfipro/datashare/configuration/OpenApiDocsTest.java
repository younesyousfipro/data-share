package io.github.younesyousfipro.datashare.configuration;

import io.github.younesyousfipro.datashare.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class OpenApiDocsTest {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void apiDocs_arePublicAndMarkOwnerRoutesAsProtected() throws Exception {
		// WHEN
		mockMvc.perform(get("/v3/api-docs"))
				// THEN
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer"))
				.andExpect(jsonPath("$.paths['/api/files'].get.security[0].bearerAuth").exists())
				.andExpect(jsonPath("$.paths['/api/download/{id}'].get.security").doesNotExist());
	}

	// Separate route: "/v3/api-docs/**" does not cover it
	@Test
	void apiDocsYaml_isPublic() throws Exception {
		// WHEN
		mockMvc.perform(get("/v3/api-docs.yaml"))
				// THEN
				.andExpect(status().isOk());
	}

	@Test
	void swaggerUi_isPublic() throws Exception {
		// WHEN
		mockMvc.perform(get("/swagger-ui/index.html"))
				// THEN
				.andExpect(status().isOk());
	}

}
