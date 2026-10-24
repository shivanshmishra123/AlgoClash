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

import java.io.File;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
@Slf4j
public class Judge0Client {

    private final RestTemplate restTemplate;

    @Value("${judge0.url:http://localhost:2358}")
    private String judge0Url;

    @Value("${judge0.api-key:}")
    private String judge0ApiKey;

    @Retry(name = "judge0")
    @CircuitBreaker(name = "judge0", fallbackMethod = "fallbackSubmit")
    public Judge0Response submitAndWait(Judge0Request request) {
        String url = judge0Url + "/submissions?wait=true";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        if (judge0ApiKey != null && !judge0ApiKey.trim().isEmpty()) {
            String token = judge0ApiKey.trim();
            headers.set("X-Auth-Token", token);
            headers.set("X-RapidAPI-Key", token);
            headers.set("Authorization", token);
        }

        HttpEntity<Judge0Request> entity = new HttpEntity<>(request, headers);
        ResponseEntity<Judge0Response> response = restTemplate.postForEntity(url, entity, Judge0Response.class);

        return response.getBody();
    }

    public Judge0Response fallbackSubmit(Judge0Request request, Throwable throwable) {
        log.warn("Judge0 execution failed or circuit breaker active ({}). Evaluating fallback for languageId: {}",
                throwable.getMessage(), request.getLanguageId());

        // For Java (languageId 91), execute in local JDK sandbox as a resilient fallback
        if (request.getLanguageId() != null && request.getLanguageId() == 91) {
            try {
                return executeLocalJava(request);
            } catch (Exception e) {
                log.error("Local Java fallback execution failed: {}", e.getMessage(), e);
            }
        }

        return null;
    }

    private Judge0Response executeLocalJava(Judge0Request request) throws Exception {
        Path tempDir = Files.createTempDirectory("algoclash_java_");
        try {
            String source = request.getSourceCode() != null ? request.getSourceCode() : "";
            String className = "Solution";
            Matcher matcher = Pattern.compile("public\\s+class\\s+([A-Za-z0-9_]+)").matcher(source);
            if (matcher.find()) {
                className = matcher.group(1);
            }

            Path javaFile = tempDir.resolve(className + ".java");
            Files.writeString(javaFile, source, StandardCharsets.UTF_8);

            // 1. Compile
            Process compileProcess = new ProcessBuilder("javac", className + ".java")
                    .directory(tempDir.toFile())
                    .start();

            boolean compiled = compileProcess.waitFor(10, TimeUnit.SECONDS);
            if (!compiled || compileProcess.exitValue() != 0) {
                String compileError = new String(compileProcess.getErrorStream().readAllBytes(), StandardCharsets.UTF_8);
                return Judge0Response.builder()
                        .compileOutput(compileError)
                        .status(new Judge0Response.Judge0Status(6, "Compilation Error"))
                        .build();
            }

            // 2. Execute
            Process runProcess = new ProcessBuilder("java", "-cp", ".", className)
                    .directory(tempDir.toFile())
                    .start();

            if (request.getStdin() != null && !request.getStdin().isEmpty()) {
                try (OutputStream os = runProcess.getOutputStream()) {
                    os.write(request.getStdin().getBytes(StandardCharsets.UTF_8));
                    os.flush();
                }
            } else {
                runProcess.getOutputStream().close();
            }

            long timeoutMs = request.getCpuTimeLimit() != null
                    ? (long) (request.getCpuTimeLimit() * 1000)
                    : 3000;
            boolean finished = runProcess.waitFor(Math.max(timeoutMs, 2500), TimeUnit.MILLISECONDS);

            if (!finished) {
                runProcess.destroyForcibly();
                return Judge0Response.builder()
                        .status(new Judge0Response.Judge0Status(5, "Time Limit Exceeded"))
                        .build();
            }

            String stdout = new String(runProcess.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            String stderr = new String(runProcess.getErrorStream().readAllBytes(), StandardCharsets.UTF_8);

            if (runProcess.exitValue() != 0) {
                return Judge0Response.builder()
                        .stderr(stderr)
                        .status(new Judge0Response.Judge0Status(11, "Runtime Error"))
                        .build();
            }

            String expected = request.getExpectedOutput() != null ? request.getExpectedOutput().trim() : "";
            String actual = stdout.trim();

            if (actual.equals(expected)) {
                return Judge0Response.builder()
                        .stdout(stdout)
                        .status(new Judge0Response.Judge0Status(3, "Accepted"))
                        .build();
            } else {
                return Judge0Response.builder()
                        .stdout(stdout)
                        .status(new Judge0Response.Judge0Status(4, "Wrong Answer"))
                        .build();
            }
        } finally {
            try {
                try (var stream = Files.walk(tempDir)) {
                    stream.sorted(Comparator.reverseOrder())
                            .map(Path::toFile)
                            .forEach(File::delete);
                }
            } catch (Exception ignored) {
            }
        }
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
