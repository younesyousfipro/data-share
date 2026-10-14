package io.github.younesyousfipro.datashare.exception;

public class FileExpiredException extends RuntimeException {

	public FileExpiredException() {
		super("This file has expired");
	}

}
