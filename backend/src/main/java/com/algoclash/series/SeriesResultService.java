package com.algoclash.series;

import com.algoclash.series.event.MatchCompletedEvent;
import com.algoclash.user.User;
import com.algoclash.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SeriesResultService {

    private final UserRepository userRepository;

    @EventListener
    @Transactional
    public void handleMatchCompleted(MatchCompletedEvent event) {
        if (event.winnerId() == null) {
            log.warn("MatchCompletedEvent received with null winnerId for match: {}", event.matchId());
            return;
        }

        userRepository.findById(event.winnerId()).ifPresent(winner -> {
            winner.setWins(winner.getWins() + 1);
            winner.setRating(winner.getRating() + 10);
            userRepository.save(winner);
            log.info("Awarded win to user {} ({}). Rating: {} (+10), Total wins: {}",
                    winner.getId(), winner.getUsername(), winner.getRating(), winner.getWins());
        });

        if (event.loserId() != null) {
            userRepository.findById(event.loserId()).ifPresent(loser -> {
                loser.setLosses(loser.getLosses() + 1);
                loser.setRating(Math.max(0, loser.getRating() - 5));
                userRepository.save(loser);
                log.info("Recorded loss for user {} ({}). Rating: {} (-5 floored), Total losses: {}",
                        loser.getId(), loser.getUsername(), loser.getRating(), loser.getLosses());
            });
        }
    }
}
