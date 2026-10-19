package io.github.younesyousfipro.datashare;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DatashareApplication {

	public static void main(String[] args) {
		SpringApplication.run(DatashareApplication.class, args);
	}

}
