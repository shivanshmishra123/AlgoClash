package com.algoclash.config;

import com.algoclash.user.User;
import com.algoclash.user.UserRepository;
import com.algoclash.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@RequiredArgsConstructor
public class AdminSeederConfig {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public CommandLineRunner adminSeeder() {
        return args -> {
            if (userRepository.existsByUsername("admin")) {
                return;
            }

            User admin = new User();
            admin.setUsername("admin");
            admin.setEmail("admin@algoclash.dev");
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            admin.setRole(UserRole.ADMIN);
            admin.setRating(1500);

            userRepository.save(admin);
            System.out.println("Default admin user created: admin / admin123");
        };
    }
}
