package it.footmanager;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class GeneraHash {

    public static void main(String[] args) {

        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
        String password = "admin";
        String hash = encoder.encode(password);
        System.out.println("Password originale: " + password);
        System.out.println("Hash BCrypt: " + hash);
    }
}