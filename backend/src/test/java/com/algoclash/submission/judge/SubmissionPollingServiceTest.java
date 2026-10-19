package com.algoclash.submission.judge;

import com.algoclash.match.Match;
import com.algoclash.match.MatchState;
import com.algoclash.problem.Problem;
import com.algoclash.submission.MatchFinalizationService;
import com.algoclash.submission.Submission;
import com.algoclash.submission.SubmissionLanguage;
import com.algoclash.submission.SubmissionRepository;
import com.algoclash.submission.SubmissionVerdict;
import com.algoclash.submission.dto.SubmissionUpdateMessage;
import com.algoclash.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubmissionPollingServiceTest {

    @Mock
    private SubmissionRepository submissionRepository;

    @Mock
    private Judge0Client judge0Client;

    @Mock
    private MatchFinalizationService matchFinalizationService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private SubmissionPollingService pollingService;

    private User user;
    private Problem problem;
    private Match match;
    private Submission submission;

    @BeforeEach
    void setUp() {
        user = User.builder().id(10L).username("coder1").build();

        problem = Problem.builder()
                .id(1L)
                .timeLimitMillis(1000)
                .memoryLimitMb(256)
                .testcasesJson("[{\"input\":\"1 2\\n\",\"output\":\"3\\n\"},{\"input\":\"2 3\\n\",\"output\":\"5\\n\"}]")
                .build();

        match = Match.builder()
                .id(100L)
                .problem(problem)
                .player1(user)
                .state(MatchState.ONGOING)
                .build();

        submission = Submission.builder()
                .id(500L)
                .match(match)
                .user(user)
                .language(SubmissionLanguage.JAVA)
                .code("class Main {}")
                .verdict(SubmissionVerdict.PENDING)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void shouldEvaluateAcceptedWhenAllTestCasesPass() {
        when(submissionRepository.findById(500L)).thenReturn(Optional.of(submission));
        when(judge0Client.getLanguageId(SubmissionLanguage.JAVA)).thenReturn(91);

        Judge0Response accepted = Judge0Response.builder()
                .status(new Judge0Response.Judge0Status(3, "Accepted"))
                .build();
        when(judge0Client.submitAndWait(any(Judge0Request.class))).thenReturn(accepted);

        pollingService.evaluateSubmission(500L);

        assertThat(submission.getVerdict()).isEqualTo(SubmissionVerdict.ACCEPTED);
        verify(submissionRepository).save(submission);
        verify(matchFinalizationService).finalize(100L, 10L);

        ArgumentCaptor<SubmissionUpdateMessage> msgCaptor = ArgumentCaptor.forClass(SubmissionUpdateMessage.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/match/100"), msgCaptor.capture());
        assertThat(msgCaptor.getValue().getVerdict()).isEqualTo(SubmissionVerdict.ACCEPTED);
    }

    @Test
    void shouldEvaluateWrongAnswerAndNotFinalizeMatch() {
        when(submissionRepository.findById(500L)).thenReturn(Optional.of(submission));
        when(judge0Client.getLanguageId(SubmissionLanguage.JAVA)).thenReturn(91);

        Judge0Response wrong = Judge0Response.builder()
                .status(new Judge0Response.Judge0Status(4, "Wrong Answer"))
                .build();
        when(judge0Client.submitAndWait(any(Judge0Request.class))).thenReturn(wrong);

        pollingService.evaluateSubmission(500L);

        assertThat(submission.getVerdict()).isEqualTo(SubmissionVerdict.WRONG_ANSWER);
        verify(submissionRepository).save(submission);
        verify(matchFinalizationService, never()).finalize(anyLong(), anyLong());

        verify(messagingTemplate).convertAndSend(eq("/topic/match/100"), any(SubmissionUpdateMessage.class));
    }

    @Test
    void shouldEvaluateInternalErrorWhenJudge0Fails() {
        when(submissionRepository.findById(500L)).thenReturn(Optional.of(submission));
        when(judge0Client.getLanguageId(SubmissionLanguage.JAVA)).thenReturn(91);
        when(judge0Client.submitAndWait(any(Judge0Request.class))).thenReturn(null);

        pollingService.evaluateSubmission(500L);

        assertThat(submission.getVerdict()).isEqualTo(SubmissionVerdict.INTERNAL_ERROR);
        verify(submissionRepository).save(submission);
        verify(matchFinalizationService, never()).finalize(anyLong(), anyLong());
    }
}
