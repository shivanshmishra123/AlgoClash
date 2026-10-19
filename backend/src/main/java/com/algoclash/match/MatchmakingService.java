package com.algoclash.match;

import com.algoclash.match.dto.MatchmakingResponse;
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
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchmakingService {

    public record QueueEntry(Long userId, String username, int rating, LocalDateTime joinedAt) {}

    private final Map<Long, QueueEntry> queue = new ConcurrentHashMap<>();
    private final Map<Long, MatchmakingResponse> matchResults = new ConcurrentHashMap<>();

    private final UserRepository userRepository;
    private final ProblemRepository problemRepository;
    private final SeriesRepository seriesRepository;
    private final MatchRepository matchRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final PasswordEncoder passwordEncoder;

    private static final int RATING_WINDOW = 100;

    @Transactional
    public synchronized MatchmakingResponse joinQueue(User currentUser) {
        Long userId = currentUser.getId();

        // 1. If user already has a pending matched result, return it
        if (matchResults.containsKey(userId)) {
            MatchmakingResponse res = matchResults.remove(userId);
            log.info("User {} retrieved existing match result for match {}", userId, res.getMatchId());
            return res;
        }

        int userRating = currentUser.getRating();
        int minRating = userRating - RATING_WINDOW;
        int maxRating = userRating + RATING_WINDOW;

        // 2. Search for an eligible opponent in queue (Strict +/- 100 Elo)
        QueueEntry bestOpponent = null;
        int closestDiff = Integer.MAX_VALUE;

        for (QueueEntry entry : queue.values()) {
            if (entry.userId().equals(userId)) continue;

            int diff = Math.abs(entry.rating() - userRating);
            if (diff <= RATING_WINDOW && diff < closestDiff) {
                closestDiff = diff;
                bestOpponent = entry;
            }
        }

        // 3. If an eligible opponent is found, form a match immediately
        if (bestOpponent != null) {
            final Long opponentId = bestOpponent.userId();
            final String opponentName = bestOpponent.username();
            final int opponentRating = bestOpponent.rating();

            queue.remove(opponentId);
            queue.remove(userId);

            User opponentUser = userRepository.findById(opponentId)
                    .orElseThrow(() -> new IllegalStateException("Opponent user not found: " + opponentId));

            Match match = createDuelMatch(opponentName, currentUser.getUsername(), opponentUser, currentUser);

            MatchmakingResponse currentResponse = MatchmakingResponse.builder()
                    .status("MATCHED")
                    .matchId(match.getId())
                    .opponentUsername(opponentUser.getUsername())
                    .opponentRating(opponentUser.getRating())
                    .userRating(userRating)
                    .minRating(minRating)
                    .maxRating(maxRating)
                    .message("Match found with " + opponentUser.getUsername() + " (" + opponentUser.getRating() + " Elo)")
                    .build();

            MatchmakingResponse opponentResponse = MatchmakingResponse.builder()
                    .status("MATCHED")
                    .matchId(match.getId())
                    .opponentUsername(currentUser.getUsername())
                    .opponentRating(userRating)
                    .userRating(opponentUser.getRating())
                    .minRating(opponentUser.getRating() - RATING_WINDOW)
                    .maxRating(opponentUser.getRating() + RATING_WINDOW)
                    .message("Match found with " + currentUser.getUsername() + " (" + userRating + " Elo)")
                    .build();

            // Cache result for opponent so polling picks it up if WebSocket was delayed
            matchResults.put(opponentUser.getId(), opponentResponse);

            // Push notifications via STOMP WebSocket
            messagingTemplate.convertAndSend("/topic/matchmaking/" + currentUser.getUsername(), currentResponse);
            messagingTemplate.convertAndSend("/topic/matchmaking/" + opponentUser.getUsername(), opponentResponse);

            log.info("1v1 Match created: Match #{} between {} ({} Elo) and {} ({} Elo)",
                    match.getId(), opponentUser.getUsername(), opponentUser.getRating(),
                    currentUser.getUsername(), userRating);

            return currentResponse;
        }

        // 4. No opponent yet -> put user in queue
        queue.put(userId, new QueueEntry(userId, currentUser.getUsername(), userRating, LocalDateTime.now()));
        log.info("User {} ({} Elo) entered 1v1 matchmaking queue. Total in queue: {}",
                currentUser.getUsername(), userRating, queue.size());

        return MatchmakingResponse.builder()
                .status("QUEUED")
                .userRating(userRating)
                .minRating(minRating)
                .maxRating(maxRating)
                .message("Queued. Searching for opponents with rating " + minRating + " - " + maxRating + " Elo")
                .build();
    }

    @Transactional
    public synchronized MatchmakingResponse matchWithBot(User currentUser) {
        Long userId = currentUser.getId();
        queue.remove(userId);
        matchResults.remove(userId);

        int userRating = currentUser.getRating();

        // Retrieve or seed a sparring bot around user's rating
        String botName = "bot_sparr_" + (userRating / 100 * 100);
        User botUser = userRepository.findByUsername(botName).orElseGet(() ->
                userRepository.save(User.builder()
                        .username(botName)
                        .email(botName + "@algoclash.dev")
                        .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                        .role(UserRole.USER)
                        .rating(userRating)
                        .wins(5)
                        .losses(5)
                        .build())
        );

        Match match = createDuelMatch(botUser.getUsername(), currentUser.getUsername(), botUser, currentUser);

        MatchmakingResponse res = MatchmakingResponse.builder()
                .status("MATCHED")
                .matchId(match.getId())
                .opponentUsername(botUser.getUsername())
                .opponentRating(botUser.getRating())
                .userRating(userRating)
                .minRating(userRating - RATING_WINDOW)
                .maxRating(userRating + RATING_WINDOW)
                .message("Sparring match initialized against " + botUser.getUsername() + " (" + botUser.getRating() + " Elo)")
                .build();

        messagingTemplate.convertAndSend("/topic/matchmaking/" + currentUser.getUsername(), res);
        return res;
    }

    public synchronized MatchmakingResponse leaveQueue(User currentUser) {
        queue.remove(currentUser.getId());
        matchResults.remove(currentUser.getId());
        log.info("User {} left matchmaking queue", currentUser.getUsername());

        return MatchmakingResponse.builder()
                .status("CANCELLED")
                .message("Left matchmaking queue")
                .build();
    }

    public synchronized MatchmakingResponse getStatus(User currentUser) {
        Long userId = currentUser.getId();

        if (matchResults.containsKey(userId)) {
            return matchResults.remove(userId);
        }

        QueueEntry entry = queue.get(userId);
        if (entry != null) {
            int rating = entry.rating();
            return MatchmakingResponse.builder()
                    .status("QUEUED")
                    .userRating(rating)
                    .minRating(rating - RATING_WINDOW)
                    .maxRating(rating + RATING_WINDOW)
                    .message("Searching for duelists...")
                    .build();
        }

        return MatchmakingResponse.builder()
                .status("IDLE")
                .message("Not in matchmaking queue")
                .build();
    }

    private Match createDuelMatch(String p1Name, String p2Name, User p1, User p2) {
        // Choose problem
        List<Problem> problems = problemRepository.findAll();
        Problem problem;
        if (problems.isEmpty()) {
            problem = problemRepository.save(Problem.builder()
                    .title("Two Sum (Duel)")
                    .description("Given two integers A and B, print their sum.\n\n### Input\nA B\n\n### Output\nA + B")
                    .difficulty(ProblemDifficulty.EASY)
                    .timeLimitMillis(1000)
                    .memoryLimitMb(256)
                    .sampleInput("2 3")
                    .sampleOutput("5")
                    .testcasesJson("[{\"input\":\"2 3\\n\",\"output\":\"5\\n\"},{\"input\":\"10 20\\n\",\"output\":\"30\\n\"}]")
                    .build());
        } else {
            // Pick a random problem from catalog
            problem = problems.get(new Random().nextInt(problems.size()));
        }

        // Create size-2 Series for this 1v1 duel
        Series series = seriesRepository.save(Series.builder()
                .name("Ranked Duel: " + p1Name + " vs " + p2Name)
                .size(2)
                .status(SeriesStatus.ONGOING)
                .currentRound(1)
                .startsAt(LocalDateTime.now())
                .participants(new HashSet<>(Set.of(p1, p2)))
                .build());

        // Create ONGOING match
        return matchRepository.save(Match.builder()
                .series(series)
                .problem(problem)
                .player1(p1)
                .player2(p2)
                .round(1)
                .state(MatchState.ONGOING)
                .startedAt(LocalDateTime.now())
                .build());
    }
}
