package com.algoclash.series.bracket;

import com.algoclash.match.Match;
import com.algoclash.match.MatchState;
import com.algoclash.problem.Problem;
import com.algoclash.series.Series;
import com.algoclash.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BracketStrategyTest {

    private SingleEliminationBracketStrategy strategy;
    private BracketStrategyRegistry registry;
    private Series series;
    private Problem problem;

    @BeforeEach
    void setUp() {
        strategy = new SingleEliminationBracketStrategy();
        registry = new BracketStrategyRegistry(List.of(strategy));

        series = Series.builder()
                .id(10L)
                .name("Code Arena Cup")
                .size(8)
                .build();

        problem = Problem.builder()
                .id(1L)
                .title("Two Sum")
                .build();
    }

    @Test
    @DisplayName("supports correctly validates powers of 2")
    void supportsPowerOf2() {
        assertThat(strategy.supports(2)).isTrue();
        assertThat(strategy.supports(4)).isTrue();
        assertThat(strategy.supports(8)).isTrue();
        assertThat(strategy.supports(16)).isTrue();
        assertThat(strategy.supports(32)).isTrue();

        assertThat(strategy.supports(0)).isFalse();
        assertThat(strategy.supports(1)).isFalse();
        assertThat(strategy.supports(3)).isFalse();
        assertThat(strategy.supports(7)).isFalse();
        assertThat(strategy.supports(9)).isFalse();
    }

    @Test
    @DisplayName("generateFirstRound creates 4 matches for 8 players in round 1")
    void generateFirstRound_8Players_Creates4Matches() {
        List<User> players = new ArrayList<>();
        for (long i = 1; i <= 8; i++) {
            players.add(User.builder().id(i).username("player" + i).build());
        }

        List<Match> round1Matches = strategy.generateFirstRound(series, players, problem);

        assertThat(round1Matches).hasSize(4);
        for (Match m : round1Matches) {
            assertThat(m.getSeries()).isEqualTo(series);
            assertThat(m.getProblem()).isEqualTo(problem);
            assertThat(m.getRound()).isEqualTo(1);
            assertThat(m.getState()).isEqualTo(MatchState.PENDING);
            assertThat(m.getPlayer1()).isNotNull();
            assertThat(m.getPlayer2()).isNotNull();
            assertThat(m.getPlayer1()).isNotEqualTo(m.getPlayer2());
        }
    }

    @Test
    @DisplayName("generateNextRound creates 2 matches for 4 winners in round 2")
    void generateNextRound_4Winners_Creates2Matches() {
        List<User> winners = List.of(
                User.builder().id(1L).username("p1").build(),
                User.builder().id(3L).username("p3").build(),
                User.builder().id(5L).username("p5").build(),
                User.builder().id(7L).username("p7").build()
        );

        List<Match> round2Matches = strategy.generateNextRound(series, winners, 2, problem);

        assertThat(round2Matches).hasSize(2);
        assertThat(round2Matches.get(0).getRound()).isEqualTo(2);
        assertThat(round2Matches.get(0).getPlayer1().getId()).isEqualTo(1L);
        assertThat(round2Matches.get(0).getPlayer2().getId()).isEqualTo(3L);
        assertThat(round2Matches.get(1).getPlayer1().getId()).isEqualTo(5L);
        assertThat(round2Matches.get(1).getPlayer2().getId()).isEqualTo(7L);
    }

    @Test
    @DisplayName("registry returns SingleEliminationBracketStrategy for size 8 and 16")
    void registry_ResolvesSupportedSizes() {
        assertThat(registry.hasStrategyFor(8)).isTrue();
        assertThat(registry.hasStrategyFor(16)).isTrue();
        assertThat(registry.forSize(8)).isInstanceOf(SingleEliminationBracketStrategy.class);
        assertThat(registry.forSize(16)).isInstanceOf(SingleEliminationBracketStrategy.class);

        assertThat(registry.hasStrategyFor(7)).isFalse();
        assertThatThrownBy(() -> registry.forSize(7))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("No bracket strategy registered");
    }
}
