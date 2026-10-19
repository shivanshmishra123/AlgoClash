package com.algoclash.simulation;

import com.algoclash.common.DevSeedController;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class EightPlayerSeriesSimulationIntegrationTest {

    @Autowired
    private DevSeedController devSeedController;

    @Test
    @DisplayName("P10.1.2: 8-Player Single Elimination Simulation — Registration, Kickoff, QF, SF, Finals, Series Completion & Champion")
    void testEightPlayerSingleEliminationSimulation() {
        ResponseEntity<Map<String, Object>> response = devSeedController.simulateEightPlayerSeries();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        Map<String, Object> body = response.getBody();
        assertThat(body).isNotNull();

        // 1. Verify Status & Completion
        assertThat(body.get("status")).isEqualTo("SUCCESS");
        assertThat(body.get("seriesStatus")).isEqualTo("COMPLETED");
        assertThat(body.get("totalRounds")).isEqualTo(3);
        assertThat(body.get("totalMatchesPlayed")).isEqualTo(7);

        // 2. Verify Champion declaration
        String champion = (String) body.get("champion");
        assertThat(champion).isNotNull();
        assertThat(champion).startsWith("tourney_p");

        // 3. Verify Round Breakdown: 4 QF, 2 SF, 1 Grand Final
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rounds = (List<Map<String, Object>>) body.get("rounds");
        assertThat(rounds).hasSize(3);

        // Round 1 (Quarterfinals)
        Map<String, Object> r1 = rounds.get(0);
        assertThat(r1.get("name")).isEqualTo("QUARTERFINALS");
        @SuppressWarnings("unchecked")
        List<?> r1Matches = (List<?>) r1.get("matches");
        assertThat(r1Matches).hasSize(4);

        // Round 2 (Semifinals)
        Map<String, Object> r2 = rounds.get(1);
        assertThat(r2.get("name")).isEqualTo("SEMIFINALS");
        @SuppressWarnings("unchecked")
        List<?> r2Matches = (List<?>) r2.get("matches");
        assertThat(r2Matches).hasSize(2);

        // Round 3 (Grand Finals)
        Map<String, Object> r3 = rounds.get(2);
        assertThat(r3.get("name")).isEqualTo("GRAND FINALS");
        @SuppressWarnings("unchecked")
        List<?> r3Matches = (List<?>) r3.get("matches");
        assertThat(r3Matches).hasSize(1);

        // 4. Verify Player Standings
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> standings = (List<Map<String, Object>>) body.get("playerStandings");
        assertThat(standings).hasSize(8);

        // Champion should have won 3 matches (+30 rating)
        Map<String, Object> champStats = standings.stream()
                .filter(s -> champion.equals(s.get("username")))
                .findFirst()
                .orElseThrow();
        assertThat(champStats.get("wins")).isEqualTo(3);
        assertThat(champStats.get("rating")).isEqualTo(1030);
    }
}
