package io.github.younesyousfipro.datashare.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

// First filter of the chain, so requests rejected by Spring Security (401) are measured too
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestLoggingFilter extends OncePerRequestFilter {

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		long start = System.nanoTime();
		try {
			chain.doFilter(request, response);
		} finally {
			long durationMs = (System.nanoTime() - start) / 1_000_000;
			String method = request.getMethod();
			// URI without the query string
			String path = request.getRequestURI();
			int status = response.getStatus();
			// Key-value pairs become JSON fields in the log file; the message is for the console
			log.atInfo()
					.addKeyValue("method", method)
					.addKeyValue("path", path)
					.addKeyValue("status", status)
					.addKeyValue("durationMs", durationMs)
					.log("{} {} {} {} ms", method, path, status, durationMs);
		}
	}

}
