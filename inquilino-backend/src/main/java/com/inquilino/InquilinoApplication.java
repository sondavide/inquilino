package com.inquilino;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class InquilinoApplication {

    public static void main(String[] args) {
        SpringApplication.run(InquilinoApplication.class, args);
    }
}
