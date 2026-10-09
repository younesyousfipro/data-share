package io.github.younesyousfipro.datashare.exception;

// Same message for unknown email and wrong password: registered emails cannot be guessed
public class InvalidCredentialsException extends RuntimeException {

	public InvalidCredentialsException() {
		super("Invalid email or password");
	}

}
