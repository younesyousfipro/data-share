package io.github.younesyousfipro.datashare.exception;

public class WrongFilePasswordException extends RuntimeException {

	public WrongFilePasswordException() {
		super("Missing or wrong file password");
	}

}
