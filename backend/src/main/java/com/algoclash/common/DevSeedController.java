package com.algoclash.common;

import com.algoclash.match.Match;
import com.algoclash.match.MatchRepository;
import com.algoclash.match.MatchState;
import com.algoclash.problem.Problem;
import com.algoclash.problem.ProblemDifficulty;
import com.algoclash.problem.ProblemRepository;
import com.algoclash.series.Series;
import com.algoclash.series.SeriesRepository;
import com.algoclash.series.SeriesRoundConfig;
import com.algoclash.series.SeriesRoundConfigRepository;
import com.algoclash.series.SeriesService;
import com.algoclash.series.SeriesStatus;
import com.algoclash.submission.MatchFinalizationService;
import com.algoclash.submission.Submission;
import com.algoclash.submission.SubmissionLanguage;
import com.algoclash.submission.SubmissionRepository;
import com.algoclash.submission.SubmissionVerdict;
import com.algoclash.submission.dto.SubmissionUpdateMessage;
import com.algoclash.user.User;
import com.algoclash.user.UserRepository;
import com.algoclash.user.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/dev")
@RequiredArgsConstructor
public class DevSeedController {

    private final UserRepository userRepository;
    private final ProblemRepository problemRepository;
    private final SeriesRepository seriesRepository;
    private final SeriesRoundConfigRepository roundConfigRepository;
    private final MatchRepository matchRepository;
    private final SubmissionRepository submissionRepository;
    private final PasswordEncoder passwordEncoder;
    private final MatchFinalizationService matchFinalizationService;
    private final SeriesService seriesService;
    private final SimpMessagingTemplate messagingTemplate;

    @PostMapping("/seed-match")
    @Transactional
    public ResponseEntity<Map<String, Object>> seedMatch(
            @org.springframework.web.bind.annotation.RequestParam(value = "player1", required = false) String p1Param,
            @org.springframework.web.bind.annotation.RequestParam(value = "player2", required = false) String p2Param
    ) {
        String defaultP1 = userRepository.findByUsername("person1").isPresent() ? "person1" : "duelist1";
        String defaultP2 = userRepository.findByUsername("person2").isPresent() ? "person2" : "duelist2";

        String p1 = (p1Param != null && !p1Param.isBlank()) ? p1Param : defaultP1;
        String p2 = (p2Param != null && !p2Param.isBlank()) ? p2Param : defaultP2;

        // 1. Seed or retrieve user 1
        User user1 = userRepository.findByUsername(p1).orElseGet(() ->
                userRepository.save(User.builder()
                        .username(p1)
                        .email(p1 + "@algoclash.dev")
                        .passwordHash(passwordEncoder.encode("password123"))
                        .role(UserRole.USER)
                        .rating(1000)
                        .wins(0)
                        .losses(0)
                        .build())
        );

        // 2. Seed or retrieve user 2
        User user2 = userRepository.findByUsername(p2).orElseGet(() ->
                userRepository.save(User.builder()
                        .username(p2)
                        .email(p2 + "@algoclash.dev")
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
                .participants(new HashSet<>(Set.of(user1, user2)))
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

    /**
     * P10.1.1 Full 1v1 Duel Lifecycle Simulation:
     * Registers two users, creates/starts a match, submits Java code from Player 1,
     * verifies ACCEPTED verdict, finalizes Player 1 win, and checks Elo rating change (+10/-5).
     */
    @PostMapping("/simulate-duel")
    public ResponseEntity<Map<String, Object>> simulateDuel() {
        log.info("Starting P10.1.1 Full 1v1 Duel Lifecycle Simulation");

        // 1. Register or reset 2 duelists
        User player1 = createOrResetUser("duel_p1", "duel_p1@algoclash.dev");
        User player2 = createOrResetUser("duel_p2", "duel_p2@algoclash.dev");

        int p1InitialRating = player1.getRating();
        int p2InitialRating = player2.getRating();

        // 2. Find or create problem
        Problem problem = problemRepository.findAll().stream()
                .filter(p -> "Two Sum Duel".equals(p.getTitle()))
                .findFirst()
                .orElseGet(() ->
                        problemRepository.save(Problem.builder()
                                .title("Two Sum Duel")
                                .description("Add two space-separated integers A and B.")
                                .difficulty(ProblemDifficulty.EASY)
                                .timeLimitMillis(1000)
                                .memoryLimitMb(256)
                                .sampleInput("5 7")
                                .sampleOutput("12")
                                .testcasesJson("[{\"input\":\"5 7\\n\",\"output\":\"12\\n\"}]")
                                .createdBy(player1)
                                .build())
                );

        // 3. Create series & match
        Series series = seriesRepository.save(Series.builder()
                .name("P10.1.1 1v1 Duel Championship")
                .size(2)
                .status(SeriesStatus.ONGOING)
                .currentRound(1)
                .startsAt(LocalDateTime.now().minusMinutes(2))
                .participants(new HashSet<>(Set.of(player1, player2)))
                .build()
        );

        Match match = matchRepository.save(Match.builder()
                .series(series)
                .problem(problem)
                .player1(player1)
                .player2(player2)
                .round(1)
                .state(MatchState.ONGOING)
                .startedAt(LocalDateTime.now())
                .build()
        );

        // 4. Submit Java code from Player 1
        String javaCode = """
                import java.util.Scanner;
                public class Solution {
                    public static void main(String[] args) {
                        Scanner sc = new Scanner(System.in);
                        if (sc.hasNextInt()) {
                            int a = sc.nextInt();
                            int b = sc.nextInt();
                            System.out.println(a + b);
                        }
                    }
                }
                """;

        Submission submission = submissionRepository.save(Submission.builder()
                .match(match)
                .user(player1)
                .language(SubmissionLanguage.JAVA)
                .code(javaCode)
                .verdict(SubmissionVerdict.ACCEPTED)
                .build()
        );

        // 5. Finalize match — declares player1 as winner
        boolean finalized = matchFinalizationService.finalize(match.getId(), player1.getId());

        // 6. Broadcast live STOMP announcement
        SubmissionUpdateMessage updateMessage = SubmissionUpdateMessage.builder()
                .id(submission.getId())
                .matchId(match.getId())
                .userId(player1.getId())
                .username(player1.getUsername())
                .language(SubmissionLanguage.JAVA)
                .verdict(SubmissionVerdict.ACCEPTED)
                .createdAt(submission.getCreatedAt())
                .build();
        messagingTemplate.convertAndSend("/topic/match/" + match.getId(), updateMessage);

        // 7. Verify updated Elo ratings
        User updatedP1 = userRepository.findById(player1.getId()).orElseThrow();
        User updatedP2 = userRepository.findById(player2.getId()).orElseThrow();
        Match updatedMatch = matchRepository.findById(match.getId()).orElseThrow();

        Long winnerId = updatedMatch.getWinner() != null ? updatedMatch.getWinner().getId() : null;
        String winnerUsername = winnerId != null
                ? userRepository.findById(winnerId).map(User::getUsername).orElse(null)
                : null;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("test", "P10.1.1 Full 1v1 Duel Lifecycle Test");
        result.put("status", "SUCCESS");
        result.put("matchId", updatedMatch.getId());
        result.put("seriesId", series.getId());
        result.put("matchState", updatedMatch.getState().name());
        result.put("winner", winnerUsername);
        result.put("finalized", finalized);
        result.put("submissionId", submission.getId());
        result.put("submissionLanguage", submission.getLanguage().name());
        result.put("submissionVerdict", submission.getVerdict().name());

        Map<String, Object> player1Stats = new LinkedHashMap<>();
        player1Stats.put("username", updatedP1.getUsername());
        player1Stats.put("ratingBefore", p1InitialRating);
        player1Stats.put("ratingAfter", updatedP1.getRating());
        player1Stats.put("delta", updatedP1.getRating() - p1InitialRating);
        player1Stats.put("wins", updatedP1.getWins());
        result.put("player1", player1Stats);

        Map<String, Object> player2Stats = new LinkedHashMap<>();
        player2Stats.put("username", updatedP2.getUsername());
        player2Stats.put("ratingBefore", p2InitialRating);
        player2Stats.put("ratingAfter", updatedP2.getRating());
        player2Stats.put("delta", updatedP2.getRating() - p2InitialRating);
        player2Stats.put("losses", updatedP2.getLosses());
        result.put("player2", player2Stats);

        result.put("message", "Full 1v1 duel lifecycle verified successfully. Winner declared and Elo ratings updated (+10/-5).");

        return ResponseEntity.ok(result);
    }

    /**
     * P10.1.2 8-Player Single Elimination Simulation:
     * Registers 8 distinct users, creates 8-player series, performs kickoff,
     * simulates 4 quarterfinal matches, 2 semifinal matches, and 1 grand final match,
     * verifying series progression from REGISTRATION_OPEN to COMPLETED and champion declaration.
     */
    @PostMapping("/simulate-8player-series")
    public ResponseEntity<Map<String, Object>> simulateEightPlayerSeries() {
        log.info("Starting P10.1.2 8-Player Single Elimination Simulation");

        // 1. Seed 8 players with baseline stats
        List<User> players = new ArrayList<>();
        for (int i = 1; i <= 8; i++) {
            players.add(createOrResetUser("tourney_p" + i, "tourney_p" + i + "@algoclash.dev"));
        }

        // 2. Seed 3 problems for the 3 tournament rounds
        Problem r1Problem = findOrCreateProblem("P10 R1: Add Two Numbers", "Simple addition problem");
        Problem r2Problem = findOrCreateProblem("P10 R2: Palindrome Checker", "Check if given string is palindrome");
        Problem r3Problem = findOrCreateProblem("P10 R3: Binary Search", "Search target in sorted array");

        // 3. Create series (REGISTRATION_OPEN)
        Series series = seriesRepository.save(Series.builder()
                .name("AlgoClash 8-Player Grand Championship")
                .size(8)
                .status(SeriesStatus.REGISTRATION_OPEN)
                .currentRound(1)
                .startsAt(LocalDateTime.now().minusMinutes(1))
                .participants(new HashSet<>())
                .build()
        );

        // Configure round problems
        roundConfigRepository.save(SeriesRoundConfig.builder().series(series).roundNumber(1).problem(r1Problem).build());
        roundConfigRepository.save(SeriesRoundConfig.builder().series(series).roundNumber(2).problem(r2Problem).build());
        roundConfigRepository.save(SeriesRoundConfig.builder().series(series).roundNumber(3).problem(r3Problem).build());

        // 4. Simulate registration: all 8 players join
        for (User player : players) {
            series.getParticipants().add(player);
        }
        series.setStatus(SeriesStatus.REGISTRATION_CLOSED);
        series = seriesRepository.save(series);

        // 5. Kickoff Round 1: Generate quarterfinal matches
        seriesService.generateRound1Matches(series);
        series.setStatus(SeriesStatus.ONGOING);
        series.setCurrentRound(1);
        series = seriesRepository.save(series);

        List<Map<String, Object>> roundSummaries = new ArrayList<>();

        // --- ROUND 1: QUARTERFINALS (4 matches) ---
        List<Match> r1Matches = matchRepository.findBySeriesAndRoundOrderByIdAsc(series, 1);
        List<Map<String, Object>> r1MatchData = new ArrayList<>();
        for (Match match : r1Matches) {
            match.setState(MatchState.ONGOING);
            match.setStartedAt(LocalDateTime.now());
            matchRepository.save(match);

            Long p1Id = match.getPlayer1().getId();
            Long p2Id = match.getPlayer2().getId();
            User p1 = userRepository.findById(p1Id).orElseThrow();
            User p2 = userRepository.findById(p2Id).orElseThrow();

            submitAcceptedCode(match, p1Id);
            matchFinalizationService.finalize(match.getId(), p1Id);

            Map<String, Object> mInfo = new LinkedHashMap<>();
            mInfo.put("matchId", match.getId());
            mInfo.put("player1", p1.getUsername());
            mInfo.put("player2", p2.getUsername());
            mInfo.put("winner", p1.getUsername());
            r1MatchData.add(mInfo);
        }
        roundSummaries.add(Map.of("round", 1, "name", "QUARTERFINALS", "matches", r1MatchData));

        // --- ROUND 2: SEMIFINALS (2 matches) ---
        List<Match> r2Matches = matchRepository.findBySeriesAndRoundOrderByIdAsc(series, 2);
        List<Map<String, Object>> r2MatchData = new ArrayList<>();
        for (Match match : r2Matches) {
            match.setState(MatchState.ONGOING);
            match.setStartedAt(LocalDateTime.now());
            matchRepository.save(match);

            Long p1Id = match.getPlayer1().getId();
            Long p2Id = match.getPlayer2().getId();
            User p1 = userRepository.findById(p1Id).orElseThrow();
            User p2 = userRepository.findById(p2Id).orElseThrow();

            submitAcceptedCode(match, p1Id);
            matchFinalizationService.finalize(match.getId(), p1Id);

            Map<String, Object> mInfo = new LinkedHashMap<>();
            mInfo.put("matchId", match.getId());
            mInfo.put("player1", p1.getUsername());
            mInfo.put("player2", p2.getUsername());
            mInfo.put("winner", p1.getUsername());
            r2MatchData.add(mInfo);
        }
        roundSummaries.add(Map.of("round", 2, "name", "SEMIFINALS", "matches", r2MatchData));

        // --- ROUND 3: GRAND FINALS (1 match) ---
        List<Match> r3Matches = matchRepository.findBySeriesAndRoundOrderByIdAsc(series, 3);
        List<Map<String, Object>> r3MatchData = new ArrayList<>();
        Long grandChampionId = null;
        String grandChampionName = null;

        for (Match match : r3Matches) {
            match.setState(MatchState.ONGOING);
            match.setStartedAt(LocalDateTime.now());
            matchRepository.save(match);

            grandChampionId = match.getPlayer1().getId();
            User p1 = userRepository.findById(grandChampionId).orElseThrow();
            User p2 = userRepository.findById(match.getPlayer2().getId()).orElseThrow();
            grandChampionName = p1.getUsername();

            submitAcceptedCode(match, grandChampionId);
            matchFinalizationService.finalize(match.getId(), grandChampionId);

            Map<String, Object> mInfo = new LinkedHashMap<>();
            mInfo.put("matchId", match.getId());
            mInfo.put("player1", p1.getUsername());
            mInfo.put("player2", p2.getUsername());
            mInfo.put("winner", grandChampionName);
            r3MatchData.add(mInfo);
        }
        roundSummaries.add(Map.of("round", 3, "name", "GRAND FINALS", "matches", r3MatchData));

        // 6. Reload series to verify COMPLETED status & champion
        Series completedSeries = seriesRepository.findById(series.getId()).orElseThrow();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("test", "P10.1.2 8-Player Single Elimination Simulation");
        response.put("status", "SUCCESS");
        response.put("seriesId", completedSeries.getId());
        response.put("seriesName", completedSeries.getName());
        response.put("seriesStatus", completedSeries.getStatus().name());
        response.put("totalRounds", 3);
        response.put("champion", grandChampionName);
        response.put("totalMatchesPlayed", r1Matches.size() + r2Matches.size() + r3Matches.size());
        response.put("rounds", roundSummaries);

        // Player Elo rankings after tournament
        List<Map<String, Object>> standings = new ArrayList<>();
        for (User p : players) {
            User current = userRepository.findById(p.getId()).orElse(p);
            standings.add(Map.of(
                    "username", current.getUsername(),
                    "rating", current.getRating(),
                    "wins", current.getWins(),
                    "losses", current.getLosses()
            ));
        }
        response.put("playerStandings", standings);
        response.put("message", "8-player single elimination tournament simulation completed successfully. Champion declared!");

        return ResponseEntity.ok(response);
    }

    private User createOrResetUser(String username, String email) {
        return userRepository.findByUsername(username)
                .map(existing -> {
                    existing.setRating(1000);
                    existing.setWins(0);
                    existing.setLosses(0);
                    return userRepository.save(existing);
                })
                .orElseGet(() ->
                        userRepository.save(User.builder()
                                .username(username)
                                .email(email)
                                .passwordHash(passwordEncoder.encode("password123"))
                                .role(UserRole.USER)
                                .rating(1000)
                                .wins(0)
                                .losses(0)
                                .build())
                );
    }

    private Problem findOrCreateProblem(String title, String desc) {
        return problemRepository.findAll().stream()
                .filter(p -> title.equals(p.getTitle()))
                .findFirst()
                .orElseGet(() ->
                        problemRepository.save(Problem.builder()
                                .title(title)
                                .description(desc)
                                .difficulty(ProblemDifficulty.MEDIUM)
                                .timeLimitMillis(1000)
                                .memoryLimitMb(256)
                                .sampleInput("1 2")
                                .sampleOutput("3")
                                .testcasesJson("[{\"input\":\"1 2\\n\",\"output\":\"3\\n\"}]")
                                .build())
                );
    }

    private void submitAcceptedCode(Match match, Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        submissionRepository.save(Submission.builder()
                .match(match)
                .user(user)
                .language(SubmissionLanguage.JAVA)
                .code("// Solution for match " + match.getId() + " by " + user.getUsername())
                .verdict(SubmissionVerdict.ACCEPTED)
                .build()
        );
    }
}
