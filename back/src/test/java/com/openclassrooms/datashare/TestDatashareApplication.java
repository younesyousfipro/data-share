package com.openclassrooms.datashare;

import org.springframework.boot.SpringApplication;

public class TestDatashareApplication {

	public static void main(String[] args) {
		SpringApplication.from(DatashareApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
