package com.algoclash.series;

import com.algoclash.match.Match;
import com.algoclash.match.MatchRepository;
import com.algoclash.match.MatchState;
import com.algoclash.problem.Problem;
import com.algoclash.problem.ProblemRepository;
import com.algoclash.series.bracket.BracketStrategy;
import com.algoclash.series.bracket.BracketStrategyRegistry;
import com.algoclash.series.dto.CreateSeriesRequest;
import com.algoclash.series.dto.SeriesDetailResponse;
import com.algoclash.series.dto.SeriesSummaryResponse;
import com.algoclash.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SeriesServiceTest {

    @Mock
    private SeriesRepository seriesRepository;

    @Mock
    private MatchRepository matchRepository;

    @Mock
    private ProblemRepository problemRepository;

    @Mock
    private SeriesRoundConfigRepository roundConfigRepository;

    @Mock
    private BracketStrategyRegistry bracketStrategyRegistry;

    @Mock
    private BracketStrategy bracketStrategy;

    @InjectMocks
    private SeriesService seriesService;

    private User admin;
    private User player1;
    private User player2;

    @BeforeEach
    void setUp() {
        admin = User.builder().id(1L).username("admin").build();
        player1 = User.builder().id(2L).username("player1").build();
        player2 = User.builder().id(3L).username("player2").build();
    }

    @Test
    @DisplayName("createSeries creates series and per-round configurations")
    void createSeries_Success() {
        CreateSeriesRequest request = new CreateSeriesRequest();
        request.setName("Summer Clash");
        request.setSize(8);
        request.setStartsAt(LocalDateTime.now().plusDays(1));
        request.setRoundProblems(Map.of(1, 101L, 2, 102L, 3, 103L));

        when(bracketStrategyRegistry.hasStrategyFor(8)).thenReturn(true);
        when(problemRepository.findById(anyLong())).thenAnswer(inv -> {
            Long id = inv.getArgument(0);
            return Optional.of(Problem.builder().id(id).title("Problem " + id).build());
        });

        Series savedSeries = Series.builder()
                .id(1L)
                .name(request.getName())
                .size(8)
                .status(SeriesStatus.REGISTRATION_OPEN)
                .currentRound(1)
                .startsAt(request.getStartsAt())
                .participants(new HashSet<>())
                .build();

        when(seriesRepository.save(any(Series.class))).thenReturn(savedSeries);

        SeriesSummaryResponse response = seriesService.createSeries(request, admin);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getName()).isEqualTo("Summer Clash");
        assertThat(response.getStatus()).isEqualTo(SeriesStatus.REGISTRATION_OPEN);
        verify(roundConfigRepository, times(3)).save(any(SeriesRoundConfig.class));
    }

    @Test
    @DisplayName("createSeries throws 400 for unsupported size")
    void createSeries_UnsupportedSize() {
        CreateSeriesRequest request = new CreateSeriesRequest();
        request.setSize(7);

        when(bracketStrategyRegistry.hasStrategyFor(7)).thenReturn(false);

        assertThatThrownBy(() -> seriesService.createSeries(request, admin))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Unsupported tournament size");
    }

    @Test
    @DisplayName("joinSeries successfully adds participant")
    void joinSeries_Success() {
        Series series = Series.builder()
                .id(1L)
                .name("Tourney")
                .size(4)
                .status(SeriesStatus.REGISTRATION_OPEN)
                .participants(new HashSet<>(List.of(player1)))
                .build();

        when(seriesRepository.findById(1L)).thenReturn(Optional.of(series));
        when(matchRepository.findBySeriesOrderByRoundAscIdAsc(series)).thenReturn(List.of());

        SeriesDetailResponse response = seriesService.joinSeries(1L, player2);

        assertThat(series.getParticipants()).contains(player2);
        assertThat(series.getStatus()).isEqualTo(SeriesStatus.REGISTRATION_OPEN);
        verify(seriesRepository).save(series);
    }

    @Test
    @DisplayName("joinSeries transitions status to REGISTRATION_CLOSED when full")
    void joinSeries_ClosesWhenFull() {
        Series series = Series.builder()
                .id(1L)
                .name("Tourney")
                .size(2)
                .status(SeriesStatus.REGISTRATION_OPEN)
                .participants(new HashSet<>(List.of(player1)))
                .build();

        when(seriesRepository.findById(1L)).thenReturn(Optional.of(series));
        when(matchRepository.findBySeriesOrderByRoundAscIdAsc(series)).thenReturn(List.of());

        seriesService.joinSeries(1L, player2);

        assertThat(series.getParticipants()).hasSize(2);
        assertThat(series.getStatus()).isEqualTo(SeriesStatus.REGISTRATION_CLOSED);
    }

    @Test
    @DisplayName("joinSeries throws 400 when user already joined")
    void joinSeries_DuplicateJoin() {
        Series series = Series.builder()
                .id(1L)
                .size(4)
                .status(SeriesStatus.REGISTRATION_OPEN)
                .participants(new HashSet<>(List.of(player1)))
                .build();

        when(seriesRepository.findById(1L)).thenReturn(Optional.of(series));

        assertThatThrownBy(() -> seriesService.joinSeries(1L, player1))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("You already joined this series");
    }

    @Test
    @DisplayName("generateRound1Matches generates matches via strategy")
    void generateRound1Matches_Success() {
        Series series = Series.builder()
                .id(1L)
                .size(8)
                .participants(new HashSet<>(List.of(player1, player2)))
                .build();

        Problem p1 = Problem.builder().id(101L).title("Two Sum").build();
        SeriesRoundConfig cfg = SeriesRoundConfig.builder().roundNumber(1).problem(p1).series(series).build();

        when(roundConfigRepository.findBySeriesOrderByRoundNumberAsc(series)).thenReturn(List.of(cfg));
        when(bracketStrategyRegistry.forSize(8)).thenReturn(bracketStrategy);
        when(bracketStrategy.generateFirstRound(eq(series), anyList(), eq(p1))).thenReturn(List.of(
                Match.builder().id(10L).series(series).player1(player1).player2(player2).problem(p1).round(1).build()
        ));

        seriesService.generateRound1Matches(series);

        verify(matchRepository).saveAll(anyList());
    }
}
