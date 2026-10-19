package com.algoclash.submission.judge;

import com.algoclash.problem.Problem;
import com.algoclash.submission.MatchFinalizationService;
import com.algoclash.submission.Submission;
import com.algoclash.submission.SubmissionRepository;
import com.algoclash.submission.SubmissionVerdict;
import com.algoclash.submission.dto.SubmissionUpdateMessage;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionPollingService {

    private final SubmissionRepository submissionRepository;
    private final Judge0Client judge0Client;
    private final MatchFinalizationService matchFinalizationService;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Async
    @Transactional
    public void evaluateSubmission(Long submissionId) {
        log.info("Starting asynchronous judging for submission id: {}", submissionId);

        Submission submission = submissionRepository.findById(submissionId).orElse(null);
        if (submission == null) {
            log.error("Submission not found for async judging: {}", submissionId);
            return;
        }

        Problem problem = submission.getMatch() != null ? submission.getMatch().getProblem() : null;
        if (problem == null) {
            log.error("Problem not found for match in submission: {}", submissionId);
            settleSubmission(submission, SubmissionVerdict.INTERNAL_ERROR);
            return;
        }

        List<TestCase> testCases;
        try {
            String testcasesJson = problem.getTestcasesJson();
            if (testcasesJson == null || testcasesJson.isBlank()) {
                testcasesJson = "[]";
            }
            testCases = objectMapper.readValue(testcasesJson, new TypeReference<List<TestCase>>() {});
        } catch (Exception e) {
            log.error("Failed to parse testcases JSON for problem {}: {}", problem.getId(), e.getMessage());
            settleSubmission(submission, SubmissionVerdict.INTERNAL_ERROR);
            return;
        }

        if (testCases == null || testCases.isEmpty()) {
            log.warn("No test cases found for problem {}. Settling as INTERNAL_ERROR.", problem.getId());
            settleSubmission(submission, SubmissionVerdict.INTERNAL_ERROR);
            return;
        }

        SubmissionVerdict finalVerdict = SubmissionVerdict.ACCEPTED;
        int languageId = judge0Client.getLanguageId(submission.getLanguage());
        Double cpuTimeLimit = problem.getTimeLimitMillis() > 0 ? problem.getTimeLimitMillis() / 1000.0 : 1.0;
        Integer memoryLimit = problem.getMemoryLimitMb() > 0 ? problem.getMemoryLimitMb() * 1024 : 262144;

        for (int i = 0; i < testCases.size(); i++) {
            TestCase tc = testCases.get(i);
            Judge0Request request = Judge0Request.builder()
                    .sourceCode(submission.getCode())
                    .languageId(languageId)
                    .stdin(tc.getInput() != null ? tc.getInput() : "")
                    .expectedOutput(tc.getOutput() != null ? tc.getOutput() : "")
                    .cpuTimeLimit(cpuTimeLimit)
                    .memoryLimit(memoryLimit)
                    .build();

            Judge0Response response = judge0Client.submitAndWait(request);
            if (response == null || response.getStatus() == null || response.getStatus().getId() == null) {
                log.error("Judge0 returned empty response or circuit open on testcase {} for submission {}", i, submissionId);
                finalVerdict = SubmissionVerdict.INTERNAL_ERROR;
                break;
            }

            int statusId = response.getStatus().getId();
            log.debug("Submission {} testcase {} status: {} ({})",
                    submissionId, i, statusId, response.getStatus().getDescription());

            if (statusId == 3) {
                // Accepted, proceed to next testcase
                continue;
            } else if (statusId == 4) {
                finalVerdict = SubmissionVerdict.WRONG_ANSWER;
                break;
            } else if (statusId == 5) {
                finalVerdict = SubmissionVerdict.TIME_LIMIT_EXCEEDED;
                break;
            } else if (statusId == 6) {
                finalVerdict = SubmissionVerdict.COMPILATION_ERROR;
                break;
            } else if (statusId >= 7 && statusId <= 12) {
                finalVerdict = SubmissionVerdict.RUNTIME_ERROR;
                break;
            } else {
                finalVerdict = SubmissionVerdict.INTERNAL_ERROR;
                break;
            }
        }

        settleSubmission(submission, finalVerdict);
    }

    private void settleSubmission(Submission submission, SubmissionVerdict verdict) {
        submission.setVerdict(verdict);
        submissionRepository.save(submission);
        log.info("Submission {} settled with verdict: {}", submission.getId(), verdict);

        Long matchId = submission.getMatch() != null ? submission.getMatch().getId() : null;
        Long userId = submission.getUser() != null ? submission.getUser().getId() : null;
        String username = submission.getUser() != null ? submission.getUser().getUsername() : null;

        if (verdict == SubmissionVerdict.ACCEPTED && matchId != null && userId != null) {
            try {
                matchFinalizationService.finalize(matchId, userId);
            } catch (Exception e) {
                log.error("Error finalizing match {} for winner {}: {}", matchId, userId, e.getMessage(), e);
            }
        }

        if (matchId != null) {
            SubmissionUpdateMessage updateMessage = SubmissionUpdateMessage.builder()
                    .id(submission.getId())
                    .matchId(matchId)
                    .userId(userId)
                    .username(username)
                    .language(submission.getLanguage())
                    .verdict(verdict)
                    .createdAt(submission.getCreatedAt())
                    .build();

            String destination = "/topic/match/" + matchId;
            log.info("Broadcasting submission verdict update to WebSocket destination: {}", destination);
            messagingTemplate.convertAndSend(destination, updateMessage);
        }
    }
}
