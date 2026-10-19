package com.algoclash.common;

import com.algoclash.match.Match;
import com.algoclash.match.MatchRepository;
import com.algoclash.match.MatchState;
import com.algoclash.problem.Problem;
import com.algoclash.problem.ProblemDifficulty;
import com.algoclash.problem.ProblemRepository;
import com.algoclash.series.Series;
import com.algoclash.series.SeriesRepository;
import com.algoclash.series.SeriesStatus;
import com.algoclash.user.User;
import com.algoclash.user.UserRepository;
import com.algoclash.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dev")
@RequiredArgsConstructor
public class DevSeedController {

    private final UserRepository userRepository;
    private final ProblemRepository problemRepository;
    private final SeriesRepository seriesRepository;
    private final MatchRepository matchRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/seed-match")
    @Transactional
    public ResponseEntity<Map<String, Object>> seedMatch() {
        // 1. Seed or retrieve user 1
        User user1 = userRepository.findByUsername("duelist1").orElseGet(() ->
                userRepository.save(User.builder()
                        .username("duelist1")
                        .email("duelist1@algoclash.dev")
                        .passwordHash(passwordEncoder.encode("password123"))
                        .role(UserRole.USER)
                        .rating(1000)
                        .wins(0)
                        .losses(0)
                        .build())
        );

        // 2. Seed or retrieve user 2
        User user2 = userRepository.findByUsername("duelist2").orElseGet(() ->
                userRepository.save(User.builder()
                        .username("duelist2")
                        .email("duelist2@algoclash.dev")
                        .passwordHash(passwordEncoder.encode("password123"))
                        .role(UserRole.USER)
                        .rating(1000)
                        .wins(0)
                        .losses(0)
                        .build())
        );

        // 3. Seed demo problem
        Problem problem = problemRepository.findAll().stream()
                .filter(p -> "Two Sum (Dev)".equals(p.getTitle()))
                .findFirst()
                .orElseGet(() ->
                        problemRepository.save(Problem.builder()
                                .title("Two Sum (Dev)")
                                .description("Given two space-separated integers A and B, print their sum.\n\n### Input\nA B\n\n### Output\nSum of A and B")
                                .difficulty(ProblemDifficulty.EASY)
                                .timeLimitMillis(1000)
                                .memoryLimitMb(256)
                                .sampleInput("2 3")
                                .sampleOutput("5")
                                .testcasesJson("[{\"input\":\"2 3\\n\",\"output\":\"5\\n\"},{\"input\":\"10 20\\n\",\"output\":\"30\\n\"}]")
                                .createdBy(user1)
                                .build())
                );

        // 4. Seed demo series
        Series series = seriesRepository.save(Series.builder()
                .name("Dev Seed Tournament")
                .size(2)
                .status(SeriesStatus.ONGOING)
                .currentRound(1)
                .startsAt(LocalDateTime.now().minusMinutes(5))
                .participants(new java.util.HashSet<>(java.util.Set.of(user1, user2)))
                .build()
        );

        // 5. Seed match #1
        Match match = matchRepository.save(Match.builder()
                .series(series)
                .problem(problem)
                .player1(user1)
                .player2(user2)
                .round(1)
                .state(MatchState.ONGOING)
                .startedAt(LocalDateTime.now())
                .build()
        );

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Dev match seeded successfully");
        response.put("matchId", match.getId());
        response.put("seriesId", series.getId());
        response.put("problemId", problem.getId());
        response.put("player1", user1.getUsername());
        response.put("player2", user2.getUsername());
        response.put("state", match.getState().name());

        return ResponseEntity.ok(response);
    }
}
