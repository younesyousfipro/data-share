package io.github.younesyousfipro.datashare.logging;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RequestLoggingFilterTest {

	private final RequestLoggingFilter filter = new RequestLoggingFilter();

	private final Logger logger = (Logger) LoggerFactory.getLogger(RequestLoggingFilter.class);

	// Keeps the logged events in memory so the test can read their fields
	private final ListAppender<ILoggingEvent> appender = new ListAppender<>();

	@BeforeEach
	void setUp() {
		appender.start();
		logger.addAppender(appender);
	}

	@AfterEach
	void tearDown() {
		logger.detachAppender(appender);
	}

	@Test
	void doFilter_logsMethodPathStatusAndDuration() throws Exception {
		// GIVEN
		MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/files");
		request.setQueryString("secret=1");
		MockHttpServletResponse response = new MockHttpServletResponse();
		FilterChain chain = (req, res) -> response.setStatus(404);

		// WHEN
		filter.doFilter(request, response, chain);

		// THEN
		Map<String, Object> fields = fieldsOfSingleEvent();
		assertThat(fields)
				.containsEntry("method", "GET")
				.containsEntry("path", "/api/files")
				.containsEntry("status", 404)
				.containsKey("durationMs");
		assertThat((long) fields.get("durationMs")).isNotNegative();
	}

	@Test
	void doFilter_failingRequest_isStillLogged() {
		// GIVEN
		MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/files");
		MockHttpServletResponse response = new MockHttpServletResponse();
		FilterChain chain = (req, res) -> {
			throw new IllegalStateException("boom");
		};

		// WHEN / THEN
		assertThatThrownBy(() -> filter.doFilter(request, response, chain))
				.isInstanceOf(IllegalStateException.class);
		assertThat(fieldsOfSingleEvent()).containsEntry("path", "/api/files");
	}

	private Map<String, Object> fieldsOfSingleEvent() {
		assertThat(appender.list).hasSize(1);
		return appender.list.getFirst().getKeyValuePairs().stream()
				.collect(Collectors.toMap(pair -> pair.key, pair -> pair.value));
	}

}
