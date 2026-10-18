package com.algoclash.series;

import com.algoclash.match.Match;
import com.algoclash.match.MatchRepository;
import com.algoclash.match.MatchState;
import com.algoclash.problem.Problem;
import com.algoclash.series.bracket.BracketStrategy;
import com.algoclash.series.bracket.BracketStrategyRegistry;
import com.algoclash.series.event.MatchCompletedEvent;
import com.algoclash.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SeriesProgressionServiceTest {

    @Mock
    private SeriesRepository seriesRepository;

    @Mock
    private MatchRepository matchRepository;

    @Mock
    private SeriesRoundConfigRepository roundConfigRepository;

    @Mock
    private BracketStrategyRegistry bracketStrategyRegistry;

    @Mock
    private BracketStrategy bracketStrategy;

    @InjectMocks
    private SeriesProgressionService progressionService;

    private Series series;
    private User u1;
    private User u2;

    @BeforeEach
    void setUp() {
        series = Series.builder()
                .id(1L)
                .name("Tournament")
                .size(4) // 4 players => 2 rounds (log2(4) = 2)
                .currentRound(1)
                .status(SeriesStatus.ONGOING)
                .build();

        u1 = User.builder().id(10L).username("u1").build();
        u2 = User.builder().id(20L).username("u2").build();
    }

    @Test
    @DisplayName("Does not advance if round matches are incomplete")
    void onMatchCompleted_IncompleteRound_DoesNotAdvance() {
        Match m1 = Match.builder().id(101L).state(MatchState.COMPLETED).winner(u1).build();
        Match m2 = Match.builder().id(102L).state(MatchState.ONGOING).winner(null).build();

        when(seriesRepository.findById(1L)).thenReturn(Optional.of(series));
        when(matchRepository.findBySeriesAndRoundOrderByIdAsc(series, 1)).thenReturn(List.of(m1, m2));

        progressionService.onMatchCompleted(new MatchCompletedEvent(101L, 10L, 20L, 1L));

        assertThat(series.getCurrentRound()).isEqualTo(1);
        verify(matchRepository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("Advances to next round when all current round matches finish")
    void onMatchCompleted_RoundFinished_AdvancesToNextRound() {
        Match m1 = Match.builder().id(101L).state(MatchState.COMPLETED).winner(u1).build();
        Match m2 = Match.builder().id(102L).state(MatchState.COMPLETED).winner(u2).build();

        when(seriesRepository.findById(1L)).thenReturn(Optional.of(series));
        when(matchRepository.findBySeriesAndRoundOrderByIdAsc(series, 1)).thenReturn(List.of(m1, m2));

        Problem round2Problem = Problem.builder().id(200L).title("Final Problem").build();
        SeriesRoundConfig cfgRound2 = SeriesRoundConfig.builder().roundNumber(2).problem(round2Problem).build();
        when(roundConfigRepository.findBySeriesOrderByRoundNumberAsc(series)).thenReturn(List.of(cfgRound2));

        when(bracketStrategyRegistry.forSize(4)).thenReturn(bracketStrategy);
        when(bracketStrategy.generateNextRound(eq(series), eq(List.of(u1, u2)), eq(2), eq(round2Problem)))
                .thenReturn(List.of(Match.builder().id(201L).build()));

        progressionService.onMatchCompleted(new MatchCompletedEvent(101L, 10L, 20L, 1L));

        assertThat(series.getCurrentRound()).isEqualTo(2);
        verify(matchRepository).saveAll(anyList());
        verify(seriesRepository).save(series);
    }

    @Test
    @DisplayName("Marks series COMPLETED when final round is finished")
    void onMatchCompleted_FinalRound_MarksCompleted() {
        series.setCurrentRound(2); // For size 4, round 2 is final round (2 == log2(4))

        Match finalMatch = Match.builder().id(201L).state(MatchState.COMPLETED).winner(u1).build();

        when(seriesRepository.findById(1L)).thenReturn(Optional.of(series));
        when(matchRepository.findBySeriesAndRoundOrderByIdAsc(series, 2)).thenReturn(List.of(finalMatch));

        progressionService.onMatchCompleted(new MatchCompletedEvent(201L, 10L, 20L, 1L));

        assertThat(series.getStatus()).isEqualTo(SeriesStatus.COMPLETED);
        verify(seriesRepository).save(series);
        verify(matchRepository, never()).saveAll(anyList());
    }
}
