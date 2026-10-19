package com.algoclash.user;

import com.algoclash.match.Match;
import com.algoclash.match.MatchRepository;
import com.algoclash.match.MatchState;
import com.algoclash.series.Series;
import com.algoclash.user.dto.UserProfileResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private MatchRepository matchRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User targetUser;
    private User opponentUser;
    private Series series;

    @BeforeEach
    void setUp() {
        targetUser = User.builder()
                .id(1L)
                .username("ninja")
                .email("ninja@algoclash.dev")
                .role(UserRole.USER)
                .rating(1200)
                .wins(6)
                .losses(4)
                .createdAt(LocalDateTime.now())
                .build();

        opponentUser = User.builder()
                .id(2L)
                .username("samurai")
                .build();

        series = Series.builder()
                .id(10L)
                .name("Winter Cup")
                .build();
    }

    @Test
    void shouldReturnUserProfileWithCalculatedWinRateAndRecentMatches() {
        when(userRepository.findByUsername("ninja")).thenReturn(Optional.of(targetUser));

        Match match = Match.builder()
                .id(50L)
                .series(series)
                .player1(targetUser)
                .player2(opponentUser)
                .winner(targetUser)
                .state(MatchState.COMPLETED)
                .round(1)
                .endedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();

        when(matchRepository.findTop10ByPlayer1IdOrPlayer2IdOrderByEndedAtDescCreatedAtDesc(1L, 1L))
                .thenReturn(List.of(match));

        UserProfileResponse response = userService.getUserProfile("ninja");

        assertThat(response).isNotNull();
        assertThat(response.getUsername()).isEqualTo("ninja");
        assertThat(response.getRating()).isEqualTo(1200);
        assertThat(response.getWins()).isEqualTo(6);
        assertThat(response.getLosses()).isEqualTo(4);
        assertThat(response.getWinRate()).isEqualTo(60.0);
        assertThat(response.getRecentMatches()).hasSize(1);
        assertThat(response.getRecentMatches().get(0).getOpponentUsername()).isEqualTo("samurai");
        assertThat(response.getRecentMatches().get(0).getResult()).isEqualTo("WIN");
        assertThat(response.getRecentMatches().get(0).getSeriesName()).isEqualTo("Winter Cup");
    }

    @Test
    void shouldThrowNotFoundWhenUsernameDoesNotExist() {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getUserProfile("unknown"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }
}
