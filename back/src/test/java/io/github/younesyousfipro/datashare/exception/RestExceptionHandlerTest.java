package io.github.younesyousfipro.datashare.exception;

import io.github.younesyousfipro.datashare.dto.ErrorDetailsDTO;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import static org.assertj.core.api.Assertions.assertThat;

// The 1 GB limit is enforced while the real multipart request is parsed, a step MockMvc skips:
// the handler is called directly with the exception Spring raises
class RestExceptionHandlerTest {

	private final RestExceptionHandler handler = new RestExceptionHandler();

	@Test
	void maxUploadSizeExceeded_returns413InOurFormat() throws Exception {
		// GIVEN
		ServletWebRequest request = new ServletWebRequest(new MockHttpServletRequest("POST", "/api/files"));

		// WHEN
		ResponseEntity<Object> response = handler.handleException(new MaxUploadSizeExceededException(1024), request);

		// THEN
		assertThat(response.getStatusCode().value()).isEqualTo(413);
		assertThat(response.getBody()).isInstanceOfSatisfying(ErrorDetailsDTO.class, body -> {
			assertThat(body.message()).isNotBlank();
			assertThat(body.details()).isEqualTo("uri=/api/files");
			assertThat(body.timestamp()).isNotNull();
		});
	}

}
