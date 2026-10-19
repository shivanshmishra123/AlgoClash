package com.algoclash.submission.judge;

import com.algoclash.submission.SubmissionLanguage;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
@RequiredArgsConstructor
@Slf4j
public class Judge0Client {

    private final RestTemplate restTemplate;

    @Value("${judge0.url:http://localhost:2358}")
    private String judge0Url;

    @Retry(name = "judge0")
    @CircuitBreaker(name = "judge0", fallbackMethod = "fallbackSubmit")
    public Judge0Response submitAndWait(Judge0Request request) {
        String url = judge0Url + "/submissions?wait=true";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Judge0Request> entity = new HttpEntity<>(request, headers);
        ResponseEntity<Judge0Response> response = restTemplate.postForEntity(url, entity, Judge0Response.class);

        return response.getBody();
    }

    public Judge0Response fallbackSubmit(Judge0Request request, Throwable throwable) {
        log.error("Judge0 execution failed or circuit breaker active. Fallback triggered for request: {}. Cause: {}",
                request, throwable.getMessage());
        return null;
    }

    public int getLanguageId(SubmissionLanguage language) {
        if (language == SubmissionLanguage.JAVA) {
            return 91;
        } else if (language == SubmissionLanguage.CPP) {
            return 54;
        }
        throw new IllegalArgumentException("Unsupported language: " + language);
    }
}
