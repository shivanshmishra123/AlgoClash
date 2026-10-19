package com.algoclash.user;

import com.algoclash.match.Match;
import com.algoclash.match.MatchRepository;
import com.algoclash.match.MatchState;
import com.algoclash.user.dto.RecentMatchDto;
import com.algoclash.user.dto.UserProfileResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final MatchRepository matchRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public UserProfileResponse getUserProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with username: " + username));

        List<Match> recentMatchesList = matchRepository.findTop10ByPlayer1IdOrPlayer2IdOrderByEndedAtDescCreatedAtDesc(user.getId(), user.getId());

        List<RecentMatchDto> recentMatchDtos = recentMatchesList.stream()
                .map(match -> {
                    String opponentUsername = "Unknown";
                    if (match.getPlayer1() != null && match.getPlayer1().getId().equals(user.getId())) {
                        if (match.getPlayer2() != null) {
                            opponentUsername = match.getPlayer2().getUsername();
                        }
                    } else if (match.getPlayer2() != null && match.getPlayer2().getId().equals(user.getId())) {
                        if (match.getPlayer1() != null) {
                            opponentUsername = match.getPlayer1().getUsername();
                        }
                    }

                    String result;
                    if (match.getState() == MatchState.COMPLETED) {
                        if (match.getWinner() != null && match.getWinner().getId().equals(user.getId())) {
                            result = "WIN";
                        } else {
                            result = "LOSS";
                        }
                    } else {
                        result = match.getState().name();
                    }

                    return RecentMatchDto.builder()
                            .matchId(match.getId())
                            .seriesId(match.getSeries() != null ? match.getSeries().getId() : null)
                            .seriesName(match.getSeries() != null ? match.getSeries().getName() : null)
                            .round(match.getRound())
                            .opponentUsername(opponentUsername)
                            .result(result)
                            .endedAt(match.getEndedAt())
                            .createdAt(match.getCreatedAt())
                            .build();
                })
                .toList();

        int totalGames = user.getWins() + user.getLosses();
        double winRate = 0.0;
        if (totalGames > 0) {
            winRate = Math.round(((double) user.getWins() / totalGames * 100.0) * 10.0) / 10.0;
        }

        return UserProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .rating(user.getRating())
                .wins(user.getWins())
                .losses(user.getLosses())
                .winRate(winRate)
                .createdAt(user.getCreatedAt())
                .recentMatches(recentMatchDtos)
                .build();
    }

    @Transactional(readOnly = true)
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Transactional
    public User seedTestUser() {
        return userRepository.findByUsername("testuser").orElseGet(() ->
                userRepository.save(User.builder()
                        .username("testuser")
                        .email("testuser@algoclash.dev")
                        .passwordHash(passwordEncoder.encode("password123"))
                        .role(UserRole.USER)
                        .rating(1000)
                        .wins(0)
                        .losses(0)
                        .build())
        );
    }
}
