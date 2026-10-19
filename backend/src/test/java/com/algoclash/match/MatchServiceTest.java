package com.algoclash.match;

import com.algoclash.match.dto.MatchResponse;
import com.algoclash.problem.Problem;
import com.algoclash.problem.ProblemDifficulty;
import com.algoclash.series.Series;
import com.algoclash.submission.Submission;
import com.algoclash.submission.SubmissionLanguage;
import com.algoclash.submission.SubmissionRepository;
import com.algoclash.submission.SubmissionVerdict;
import com.algoclash.user.User;
import com.algoclash.user.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MatchServiceTest {

    @Mock
    private MatchRepository matchRepository;

    @Mock
    private SubmissionRepository submissionRepository;

    @InjectMocks
    private MatchService matchService;

    private User player1;
    private User player2;
    private User bystander;
    private Problem problem;
    private Series series;
    private Match match;

    @BeforeEach
    void setUp() {
        player1 = User.builder().id(1L).username("player1").email("p1@test.com").role(UserRole.USER).build();
        player2 = User.builder().id(2L).username("player2").email("p2@test.com").role(UserRole.USER).build();
        bystander = User.builder().id(99L).username("bystander").email("by@test.com").role(UserRole.USER).build();

        problem = Problem.builder()
                .id(10L)
                .title("Two Sum")
                .description("Sum two numbers")
                .difficulty(ProblemDifficulty.EASY)
                .timeLimitMillis(1000)
                .memoryLimitMb(256)
                .testcasesJson("[]")
                .build();

        series = Series.builder()
                .id(100L)
                .name("Speed Clash")
                .build();

        match = Match.builder()
                .id(50L)
                .series(series)
                .problem(problem)
                .player1(player1)
                .player2(player2)
                .round(1)
                .state(MatchState.ONGOING)
                .startedAt(LocalDateTime.now())
                .build();
    }

    @Test
    void shouldReturnMatchWhenUserIsParticipantAndMatchIsOngoing() {
        when(matchRepository.findById(50L)).thenReturn(Optional.of(match));

        Match result = matchService.getAccessibleMatchById(50L, 1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(50L);
    }

    @Test
    void shouldThrowForbiddenWhenUserIsNotParticipant() {
        when(matchRepository.findById(50L)).thenReturn(Optional.of(match));

        assertThatThrownBy(() -> matchService.getAccessibleMatchById(50L, 99L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void shouldThrowBadRequestWhenMatchIsPending() {
        match.setState(MatchState.PENDING);
        when(matchRepository.findById(50L)).thenReturn(Optional.of(match));

        assertThatThrownBy(() -> matchService.getAccessibleMatchById(50L, 1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void shouldThrowNotFoundWhenMatchDoesNotExist() {
        when(matchRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> matchService.getAccessibleMatchById(999L, 1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void shouldReturnMatchResponseWithOpponentAndLatestSubmission() {
        when(matchRepository.findById(50L)).thenReturn(Optional.of(match));

        Submission sub = Submission.builder()
                .id(11L)
                .match(match)
                .user(player1)
                .language(SubmissionLanguage.JAVA)
                .code("class Main {}")
                .verdict(SubmissionVerdict.ACCEPTED)
                .build();

        when(submissionRepository.findTopByMatchIdAndUserIdOrderByCreatedAtDesc(50L, 1L))
                .thenReturn(Optional.of(sub));

        MatchResponse response = matchService.getMatchResponse(50L, 1L);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(50L);
        assertThat(response.getOpponentId()).isEqualTo(2L);
        assertThat(response.getOpponentUsername()).isEqualTo("player2");
        assertThat(response.getLatestSubmissionVerdict()).isEqualTo("ACCEPTED");
        assertThat(response.getLatestSubmissionLanguage()).isEqualTo("JAVA");
    }
}
