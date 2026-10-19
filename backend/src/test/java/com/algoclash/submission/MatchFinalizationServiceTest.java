package com.algoclash.submission;

import com.algoclash.match.Match;
import com.algoclash.match.MatchRepository;
import com.algoclash.match.MatchState;
import com.algoclash.series.Series;
import com.algoclash.series.event.MatchCompletedEvent;
import com.algoclash.user.User;
import com.algoclash.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MatchFinalizationServiceTest {

    @Mock
    private MatchRepository matchRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private MatchFinalizationService finalizationService;

    private User player1;
    private User player2;
    private Series series;
    private Match match;

    @BeforeEach
    void setUp() {
        player1 = User.builder().id(1L).username("player1").build();
        player2 = User.builder().id(2L).username("player2").build();
        series = Series.builder().id(10L).build();

        match = Match.builder()
                .id(100L)
                .series(series)
                .player1(player1)
                .player2(player2)
                .state(MatchState.ONGOING)
                .build();
    }

    @Test
    void shouldFinalizeMatchAndPublishEventWhenWinnerAchievesAccepted() {
        when(matchRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(match));
        when(userRepository.findById(1L)).thenReturn(Optional.of(player1));

        boolean finalized = finalizationService.finalize(100L, 1L);

        assertThat(finalized).isTrue();
        assertThat(match.getState()).isEqualTo(MatchState.COMPLETED);
        assertThat(match.getWinner()).isEqualTo(player1);
        assertThat(match.getEndedAt()).isNotNull();

        verify(matchRepository).save(match);

        ArgumentCaptor<MatchCompletedEvent> eventCaptor = ArgumentCaptor.forClass(MatchCompletedEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        MatchCompletedEvent event = eventCaptor.getValue();
        assertThat(event.matchId()).isEqualTo(100L);
        assertThat(event.winnerId()).isEqualTo(1L);
        assertThat(event.loserId()).isEqualTo(2L);
        assertThat(event.seriesId()).isEqualTo(10L);
    }

    @Test
    void shouldNotOverwriteWinnerIfMatchIsAlreadyCompleted() {
        match.setState(MatchState.COMPLETED);
        match.setWinner(player1);
        when(matchRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(match));

        boolean finalized = finalizationService.finalize(100L, 2L);

        assertThat(finalized).isFalse();
        assertThat(match.getWinner()).isEqualTo(player1);
        verify(matchRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }
}
