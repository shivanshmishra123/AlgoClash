package com.algoclash.simulation;

import com.algoclash.common.DevSeedController;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class DuelLifecycleIntegrationTest {

    @Autowired
    private DevSeedController devSeedController;

    @Test
    @DisplayName("P10.1.1: Full 1v1 Duel Lifecycle Test — Register, Seed Match, Submit Java, Accepted Verdict, Player 1 Win & Elo Delta")
    void testFull1v1DuelLifecycle() {
        ResponseEntity<Map<String, Object>> response = devSeedController.simulateDuel();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        Map<String, Object> body = response.getBody();
        assertThat(body).isNotNull();

        // 1. Verify Status and Match State
        assertThat(body.get("status")).isEqualTo("SUCCESS");
        assertThat(body.get("matchState")).isEqualTo("COMPLETED");
        assertThat(body.get("winner")).isEqualTo("duel_p1");
        assertThat(body.get("finalized")).isEqualTo(true);

        // 2. Verify Submission details
        assertThat(body.get("submissionLanguage")).isEqualTo("JAVA");
        assertThat(body.get("submissionVerdict")).isEqualTo("ACCEPTED");

        // 3. Verify Player 1 Elo rating changes (+10)
        @SuppressWarnings("unchecked")
        Map<String, Object> p1 = (Map<String, Object>) body.get("player1");
        assertThat(p1.get("username")).isEqualTo("duel_p1");
        assertThat(p1.get("ratingBefore")).isEqualTo(1000);
        assertThat(p1.get("ratingAfter")).isEqualTo(1010);
        assertThat(p1.get("delta")).isEqualTo(10);
        assertThat(p1.get("wins")).isEqualTo(1);

        // 4. Verify Player 2 Elo rating changes (-5)
        @SuppressWarnings("unchecked")
        Map<String, Object> p2 = (Map<String, Object>) body.get("player2");
        assertThat(p2.get("username")).isEqualTo("duel_p2");
        assertThat(p2.get("ratingBefore")).isEqualTo(1000);
        assertThat(p2.get("ratingAfter")).isEqualTo(995);
        assertThat(p2.get("delta")).isEqualTo(-5);
        assertThat(p2.get("losses")).isEqualTo(1);
    }
}
