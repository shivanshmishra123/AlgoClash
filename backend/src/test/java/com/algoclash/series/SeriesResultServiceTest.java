package com.algoclash.series;

import com.algoclash.series.event.MatchCompletedEvent;
import com.algoclash.user.User;
import com.algoclash.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SeriesResultServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private SeriesResultService seriesResultService;

    private User winner;
    private User loser;

    @BeforeEach
    void setUp() {
        winner = User.builder().id(1L).username("winner").rating(1000).wins(2).losses(1).build();
        loser = User.builder().id(2L).username("loser").rating(1000).wins(1).losses(2).build();
    }

    @Test
    void shouldAdjustRatingsAndWinLossStatsOnMatchCompletedEvent() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(winner));
        when(userRepository.findById(2L)).thenReturn(Optional.of(loser));

        MatchCompletedEvent event = new MatchCompletedEvent(100L, 1L, 2L, 10L);
        seriesResultService.handleMatchCompleted(event);

        assertThat(winner.getRating()).isEqualTo(1010);
        assertThat(winner.getWins()).isEqualTo(3);
        verify(userRepository).save(winner);

        assertThat(loser.getRating()).isEqualTo(995);
        assertThat(loser.getLosses()).isEqualTo(3);
        verify(userRepository).save(loser);
    }

    @Test
    void shouldFloorLoserRatingAtZero() {
        loser.setRating(3);
        when(userRepository.findById(1L)).thenReturn(Optional.of(winner));
        when(userRepository.findById(2L)).thenReturn(Optional.of(loser));

        MatchCompletedEvent event = new MatchCompletedEvent(100L, 1L, 2L, 10L);
        seriesResultService.handleMatchCompleted(event);

        assertThat(loser.getRating()).isEqualTo(0);
        assertThat(loser.getLosses()).isEqualTo(3);
        verify(userRepository).save(loser);
    }
}
