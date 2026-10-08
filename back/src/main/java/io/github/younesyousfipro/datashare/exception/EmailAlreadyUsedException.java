package io.github.younesyousfipro.datashare.exception;

public class EmailAlreadyUsedException extends RuntimeException {

	public EmailAlreadyUsedException() {
		super("This email is already used");
	}

}
