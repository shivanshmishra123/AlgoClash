package com.algoclash.submission;

import com.algoclash.match.Match;
import com.algoclash.match.MatchRepository;
import com.algoclash.match.MatchState;
import com.algoclash.problem.Problem;
import com.algoclash.submission.dto.CreateSubmissionRequest;
import com.algoclash.submission.dto.SubmissionResponse;
import com.algoclash.submission.judge.SubmissionPollingService;
import com.algoclash.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubmissionServiceTest {

    @Mock
    private SubmissionRepository submissionRepository;

    @Mock
    private MatchRepository matchRepository;

    @Mock
    private SubmissionPollingService submissionPollingService;

    @InjectMocks
    private SubmissionService submissionService;

    private User player1;
    private User player2;
    private User outsider;
    private Match match;

    @BeforeEach
    void setUp() {
        player1 = User.builder().id(1L).username("player1").build();
        player2 = User.builder().id(2L).username("player2").build();
        outsider = User.builder().id(99L).username("outsider").build();

        Problem problem = Problem.builder().id(10L).title("Test Problem").build();

        match = Match.builder()
                .id(100L)
                .problem(problem)
                .player1(player1)
                .player2(player2)
                .state(MatchState.ONGOING)
                .build();
    }

    @Test
    void shouldCreatePendingSubmissionAndTriggerAsyncEvaluation() {
        when(matchRepository.findById(100L)).thenReturn(Optional.of(match));

        Submission savedSubmission = Submission.builder()
                .id(55L)
                .match(match)
                .user(player1)
                .language(SubmissionLanguage.JAVA)
                .code("class Main {}")
                .verdict(SubmissionVerdict.PENDING)
                .build();

        when(submissionRepository.save(any(Submission.class))).thenReturn(savedSubmission);

        CreateSubmissionRequest request = CreateSubmissionRequest.builder()
                .language(SubmissionLanguage.JAVA)
                .code("class Main {}")
                .build();

        SubmissionResponse response = submissionService.createSubmission(100L, request, player1);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(55L);
        assertThat(response.getVerdict()).isEqualTo(SubmissionVerdict.PENDING);
        assertThat(response.getMatchId()).isEqualTo(100L);

        verify(submissionPollingService).evaluateSubmission(55L);
    }

    @Test
    void shouldThrowForbiddenWhenUserIsNotParticipant() {
        when(matchRepository.findById(100L)).thenReturn(Optional.of(match));

        CreateSubmissionRequest request = CreateSubmissionRequest.builder()
                .language(SubmissionLanguage.JAVA)
                .code("class Main {}")
                .build();

        assertThatThrownBy(() -> submissionService.createSubmission(100L, request, outsider))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(submissionRepository, never()).save(any());
        verify(submissionPollingService, never()).evaluateSubmission(anyLong());
    }

    @Test
    void shouldThrowBadRequestWhenMatchIsCompleted() {
        match.setState(MatchState.COMPLETED);
        when(matchRepository.findById(100L)).thenReturn(Optional.of(match));

        CreateSubmissionRequest request = CreateSubmissionRequest.builder()
                .language(SubmissionLanguage.JAVA)
                .code("class Main {}")
                .build();

        assertThatThrownBy(() -> submissionService.createSubmission(100L, request, player1))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void shouldThrowBadRequestWhenMatchIsPending() {
        match.setState(MatchState.PENDING);
        when(matchRepository.findById(100L)).thenReturn(Optional.of(match));

        CreateSubmissionRequest request = CreateSubmissionRequest.builder()
                .language(SubmissionLanguage.JAVA)
                .code("class Main {}")
                .build();

        assertThatThrownBy(() -> submissionService.createSubmission(100L, request, player1))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }
}
