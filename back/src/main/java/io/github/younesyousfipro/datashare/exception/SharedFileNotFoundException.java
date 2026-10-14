package io.github.younesyousfipro.datashare.exception;

public class SharedFileNotFoundException extends RuntimeException {

	public SharedFileNotFoundException() {
		super("File not found");
	}

}
