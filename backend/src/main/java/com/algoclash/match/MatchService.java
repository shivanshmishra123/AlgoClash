package com.algoclash.match;

import com.algoclash.match.dto.MatchResponse;
import com.algoclash.problem.Problem;
import com.algoclash.problem.dto.ProblemResponse;
import com.algoclash.submission.Submission;
import com.algoclash.submission.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MatchService {

    private final MatchRepository matchRepository;
    private final SubmissionRepository submissionRepository;
    private final com.algoclash.user.UserRepository userRepository;

    @Transactional(readOnly = true)
    public Match getAccessibleMatchById(Long matchId, Long userId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Match not found with id: " + matchId));

        com.algoclash.user.User user = userRepository.findById(userId).orElse(null);
        boolean isAdmin = user != null && user.getRole() == com.algoclash.user.UserRole.ADMIN;

        boolean isPlayer1 = match.getPlayer1() != null && match.getPlayer1().getId().equals(userId);
        boolean isPlayer2 = match.getPlayer2() != null && match.getPlayer2().getId().equals(userId);

        if (!isAdmin && !isPlayer1 && !isPlayer2) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: you are not a participant in this match");
        }

        if (!isAdmin && match.getState() == MatchState.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Match is not yet ongoing");
        }

        return match;
    }

    @Transactional(readOnly = true)
    public MatchResponse getMatchResponse(Long matchId, Long userId) {
        Match match = getAccessibleMatchById(matchId, userId);
        return mapToMatchResponse(match, userId);
    }

    public MatchResponse mapToMatchResponse(Match match, Long userId) {
        Long opponentId = null;
        String opponentUsername = null;

        if (match.getPlayer1() != null && match.getPlayer1().getId().equals(userId)) {
            if (match.getPlayer2() != null) {
                opponentId = match.getPlayer2().getId();
                opponentUsername = match.getPlayer2().getUsername();
            }
        } else if (match.getPlayer2() != null && match.getPlayer2().getId().equals(userId)) {
            if (match.getPlayer1() != null) {
                opponentId = match.getPlayer1().getId();
                opponentUsername = match.getPlayer1().getUsername();
            }
        } else {
            // Admin spectator view
            if (match.getPlayer2() != null) {
                opponentId = match.getPlayer2().getId();
                opponentUsername = match.getPlayer2().getUsername();
            } else if (match.getPlayer1() != null) {
                opponentId = match.getPlayer1().getId();
                opponentUsername = match.getPlayer1().getUsername();
            }
        }

        Optional<Submission> latestSubmissionOpt = submissionRepository
                .findTopByMatchIdAndUserIdOrderByCreatedAtDesc(match.getId(), userId);

        String latestSubmissionVerdict = null;
        String latestSubmissionLanguage = null;
        String latestSubmissionCode = null;

        if (latestSubmissionOpt.isPresent()) {
            Submission sub = latestSubmissionOpt.get();
            latestSubmissionVerdict = sub.getVerdict() != null ? sub.getVerdict().name() : null;
            latestSubmissionLanguage = sub.getLanguage() != null ? sub.getLanguage().name() : null;
            latestSubmissionCode = sub.getCode();
        }

        return MatchResponse.builder()
                .id(match.getId())
                .seriesId(match.getSeries() != null ? match.getSeries().getId() : null)
                .seriesName(match.getSeries() != null ? match.getSeries().getName() : null)
                .round(match.getRound())
                .state(match.getState())
                .player1Id(match.getPlayer1() != null ? match.getPlayer1().getId() : null)
                .player1Username(match.getPlayer1() != null ? match.getPlayer1().getUsername() : null)
                .player2Id(match.getPlayer2() != null ? match.getPlayer2().getId() : null)
                .player2Username(match.getPlayer2() != null ? match.getPlayer2().getUsername() : null)
                .opponentId(opponentId)
                .opponentUsername(opponentUsername)
                .winnerId(match.getWinner() != null ? match.getWinner().getId() : null)
                .winnerUsername(match.getWinner() != null ? match.getWinner().getUsername() : null)
                .problem(mapProblem(match.getProblem()))
                .latestSubmissionVerdict(latestSubmissionVerdict)
                .latestSubmissionLanguage(latestSubmissionLanguage)
                .latestSubmissionCode(latestSubmissionCode)
                .startedAt(match.getStartedAt())
                .endedAt(match.getEndedAt())
                .createdAt(match.getCreatedAt())
                .build();
    }

    private ProblemResponse mapProblem(Problem problem) {
        if (problem == null) {
            return null;
        }
        return ProblemResponse.builder()
                .id(problem.getId())
                .title(problem.getTitle())
                .description(problem.getDescription())
                .difficulty(problem.getDifficulty() != null ? problem.getDifficulty().name() : null)
                .timeLimitMillis(problem.getTimeLimitMillis())
                .memoryLimitMb(problem.getMemoryLimitMb())
                .sampleInput(problem.getSampleInput())
                .sampleOutput(problem.getSampleOutput())
                .testcasesJson(problem.getTestcasesJson())
                .createdByUsername(problem.getCreatedBy() != null ? problem.getCreatedBy().getUsername() : null)
                .createdAt(problem.getCreatedAt())
                .updatedAt(problem.getUpdatedAt())
                .build();
    }
}
