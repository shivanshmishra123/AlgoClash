package com.algoclash.submission;

import com.algoclash.match.Match;
import com.algoclash.match.MatchRepository;
import com.algoclash.match.MatchState;
import com.algoclash.submission.dto.CreateSubmissionRequest;
import com.algoclash.submission.dto.SubmissionResponse;
import com.algoclash.submission.judge.SubmissionPollingService;
import com.algoclash.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final MatchRepository matchRepository;
    private final SubmissionPollingService submissionPollingService;

    @Transactional
    public SubmissionResponse createSubmission(Long matchId, CreateSubmissionRequest request, User currentUser) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Match not found with id: " + matchId));

        boolean isPlayer1 = match.getPlayer1() != null && match.getPlayer1().getId().equals(currentUser.getId());
        boolean isPlayer2 = match.getPlayer2() != null && match.getPlayer2().getId().equals(currentUser.getId());

        if (!isPlayer1 && !isPlayer2) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: you are not a participant in this match");
        }

        if (match.getState() == MatchState.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot submit solution: match is already completed");
        }

        if (match.getState() == MatchState.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot submit solution: match is not yet ongoing");
        }

        if (match.getState() == MatchState.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot submit solution: match has been cancelled");
        }

        Submission submission = Submission.builder()
                .match(match)
                .user(currentUser)
                .language(request.getLanguage())
                .code(request.getCode())
                .verdict(SubmissionVerdict.PENDING)
                .build();

        Submission saved = submissionRepository.save(submission);
        log.info("Saved submission {} with PENDING verdict for user {} on match {}",
                saved.getId(), currentUser.getUsername(), matchId);

        // Asynchronously trigger judging
        submissionPollingService.evaluateSubmission(saved.getId());

        return SubmissionResponse.builder()
                .id(saved.getId())
                .matchId(match.getId())
                .userId(currentUser.getId())
                .username(currentUser.getUsername())
                .language(saved.getLanguage())
                .code(saved.getCode())
                .verdict(saved.getVerdict())
                .createdAt(saved.getCreatedAt())
                .build();
    }
}
