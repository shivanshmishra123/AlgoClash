package com.algoclash.submission.judge;

import com.algoclash.submission.SubmissionLanguage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class OnlineCompilerLiveIntegrationTest {

    private Judge0Client judge0Client;

    @BeforeEach
    void setUp() {
        String apiKey = System.getenv("JUDGE0_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            apiKey = "3544272cf49fc93287bcdde7facc7aa2";
        }

        judge0Client = new Judge0Client(new RestTemplate());
        ReflectionTestUtils.setField(judge0Client, "judge0Url", "https://api.onlinecompiler.io/api/judge0");
        ReflectionTestUtils.setField(judge0Client, "judge0ApiKey", apiKey);
    }

    @Test
    @DisplayName("Live End-to-End Test: Java code execution on OnlineCompiler.io (Accepted)")
    void testLiveJavaSubmissionAccepted() {
        String javaCode = """
                import java.util.Scanner;
                public class Solution {
                    public static void main(String[] args) {
                        Scanner sc = new Scanner(System.in);
                        if (sc.hasNextInt()) {
                            int a = sc.nextInt();
                            int b = sc.nextInt();
                            System.out.println(a + b);
                        }
                    }
                }
                """;

        Judge0Request request = Judge0Request.builder()
                .languageId(judge0Client.getLanguageId(SubmissionLanguage.JAVA))
                .sourceCode(javaCode)
                .stdin("12 28\n")
                .expectedOutput("40\n")
                .cpuTimeLimit(2.0)
                .memoryLimit(262144)
                .build();

        Judge0Response response = judge0Client.submitAndWait(request);

        assertThat(response).isNotNull();
        assertThat(response.getToken()).isNotBlank();
        assertThat(response.getStatus()).isNotNull();
        assertThat(response.getStatus().getId()).isEqualTo(3); // 3 = Accepted
        assertThat(response.getStdout()).isNotNull();
        assertThat(response.getStdout().trim()).isEqualTo("40");
    }

    @Test
    @DisplayName("Live End-to-End Test: C++ code execution on OnlineCompiler.io (Accepted)")
    void testLiveCppSubmissionAccepted() {
        String cppCode = """
                #include <iostream>
                int main() {
                    int a, b;
                    if (std::cin >> a >> b) {
                        std::cout << (a + b) << std::endl;
                    }
                    return 0;
                }
                """;

        Judge0Request request = Judge0Request.builder()
                .languageId(judge0Client.getLanguageId(SubmissionLanguage.CPP))
                .sourceCode(cppCode)
                .stdin("15 35\n")
                .expectedOutput("50\n")
                .cpuTimeLimit(2.0)
                .memoryLimit(262144)
                .build();

        Judge0Response response = judge0Client.submitAndWait(request);

        assertThat(response).isNotNull();
        assertThat(response.getToken()).isNotBlank();
        assertThat(response.getStatus()).isNotNull();
        assertThat(response.getStatus().getId()).isEqualTo(3); // 3 = Accepted
        assertThat(response.getStdout()).isNotNull();
        assertThat(response.getStdout().trim()).isEqualTo("50");
    }

    @Test
    @DisplayName("Live End-to-End Test: Wrong Answer detection on OnlineCompiler.io")
    void testLiveWrongAnswer() {
        String javaCode = """
                public class Solution {
                    public static void main(String[] args) {
                        System.out.println("Wrong");
                    }
                }
                """;

        Judge0Request request = Judge0Request.builder()
                .languageId(judge0Client.getLanguageId(SubmissionLanguage.JAVA))
                .sourceCode(javaCode)
                .stdin("1 2\n")
                .expectedOutput("3\n")
                .build();

        Judge0Response response = judge0Client.submitAndWait(request);

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isNotNull();
        assertThat(response.getStatus().getId()).isEqualTo(4); // 4 = Wrong Answer
    }
}
