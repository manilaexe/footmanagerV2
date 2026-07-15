package it.footmanager;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling   // necessario per il job settimanale del quiz
public class FootManagerApplication {

    public static void main(String[] args) {
        SpringApplication.run(FootManagerApplication.class, args);
    }
}
