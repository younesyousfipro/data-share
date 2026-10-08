package io.github.younesyousfipro.datashare.exception;

import io.github.younesyousfipro.datashare.dto.ErrorDetailsDTO;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

@RestControllerAdvice
public class RestExceptionHandler extends ResponseEntityExceptionHandler {

	@ExceptionHandler(EmailAlreadyUsedException.class)
	public ResponseEntity<ErrorDetailsDTO> handleEmailAlreadyUsed(EmailAlreadyUsedException e, WebRequest request) {
		return ResponseEntity.status(HttpStatus.CONFLICT).body(errorDetails(e.getMessage(), request));
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ErrorDetailsDTO> handleUnexpected(Exception e, WebRequest request) {
		logger.error("Unexpected error on " + request.getDescription(false), e);
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(errorDetails("Internal server error", request));
	}

	// Field names only, never the rejected value: it may be a password
	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException e,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		String message = e.getBindingResult().getFieldErrors().stream()
				.map(error -> error.getField() + ": " + error.getDefaultMessage())
				.sorted()
				.collect(Collectors.joining("; "));
		return ResponseEntity.status(status).body(errorDetails(message, request));
	}

	// Other Spring MVC errors (malformed JSON, unknown route...) keep their status, in our format
	@Override
	protected ResponseEntity<Object> handleExceptionInternal(Exception e, Object body, HttpHeaders headers,
			HttpStatusCode status, WebRequest request) {
		String message = body instanceof ProblemDetail problem ? problem.getDetail() : "Request failed";
		return ResponseEntity.status(status).headers(headers).body(errorDetails(message, request));
	}

	private ErrorDetailsDTO errorDetails(String message, WebRequest request) {
		return new ErrorDetailsDTO(LocalDateTime.now(), message, request.getDescription(false));
	}

}
