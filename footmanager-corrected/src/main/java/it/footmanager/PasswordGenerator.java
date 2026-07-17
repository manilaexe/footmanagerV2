package it.footmanager;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class PasswordGenerator {
    public static void main(String[] args) {
        var encoder = new BCryptPasswordEncoder(12);
        System.out.println(encoder.encode("ekhator"));
    }
}