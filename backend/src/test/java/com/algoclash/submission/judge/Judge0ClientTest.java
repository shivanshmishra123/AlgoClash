package com.algoclash.submission.judge;

import com.algoclash.submission.SubmissionLanguage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class Judge0ClientTest {

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private Judge0Client judge0Client;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(judge0Client, "judge0Url", "http://localhost:2358");
    }

    @Test
    void shouldSubmitCodeAndReturnJudge0Response() {
        Judge0Request request = Judge0Request.builder()
                .sourceCode("public class Main {}")
                .languageId(91)
                .stdin("1 2")
                .expectedOutput("3")
                .build();

        Judge0Response expectedResponse = Judge0Response.builder()
                .token("test-token")
                .stdout("3\n")
                .status(new Judge0Response.Judge0Status(3, "Accepted"))
                .build();

        when(restTemplate.postForEntity(eq("http://localhost:2358/submissions?wait=true"), any(HttpEntity.class), eq(Judge0Response.class)))
                .thenReturn(ResponseEntity.ok(expectedResponse));

        Judge0Response actual = judge0Client.submitAndWait(request);

        assertThat(actual).isNotNull();
        assertThat(actual.getToken()).isEqualTo("test-token");
        assertThat(actual.getStatus().getId()).isEqualTo(3);
    }

    @Test
    void shouldIncludeAuthHeadersWhenApiKeyConfigured() {
        ReflectionTestUtils.setField(judge0Client, "judge0ApiKey", "mock-secret-key");

        Judge0Request request = Judge0Request.builder()
                .sourceCode("public class Main {}")
                .languageId(91)
                .build();

        Judge0Response expectedResponse = Judge0Response.builder()
                .token("auth-token")
                .status(new Judge0Response.Judge0Status(3, "Accepted"))
                .build();

        when(restTemplate.postForEntity(
                eq("http://localhost:2358/submissions?wait=true"),
                org.mockito.ArgumentMatchers.<HttpEntity<Judge0Request>>argThat(entity ->
                        "mock-secret-key".equals(entity.getHeaders().getFirst("X-Auth-Token")) &&
                        "mock-secret-key".equals(entity.getHeaders().getFirst("Authorization")) &&
                        "mock-secret-key".equals(entity.getHeaders().getFirst("X-RapidAPI-Key"))
                ),
                eq(Judge0Response.class)
        )).thenReturn(ResponseEntity.ok(expectedResponse));

        Judge0Response actual = judge0Client.submitAndWait(request);

        assertThat(actual).isNotNull();
        assertThat(actual.getToken()).isEqualTo("auth-token");
    }

    @Test
    void shouldReturnNullWhenFallbackTriggered() {
        Judge0Request request = Judge0Request.builder()
                .sourceCode("int main() {}")
                .languageId(54)
                .build();

        Judge0Response fallbackResponse = judge0Client.fallbackSubmit(request, new RestClientException("Connection refused"));

        assertThat(fallbackResponse).isNull();
    }

    @Test
    void shouldMapLanguagesCorrectly() {
        assertThat(judge0Client.getLanguageId(SubmissionLanguage.JAVA)).isEqualTo(91);
        assertThat(judge0Client.getLanguageId(SubmissionLanguage.CPP)).isEqualTo(54);
    }
}
