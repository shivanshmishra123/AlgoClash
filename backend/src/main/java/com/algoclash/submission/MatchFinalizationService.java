package com.algoclash.submission;

import com.algoclash.match.Match;
import com.algoclash.match.MatchRepository;
import com.algoclash.match.MatchState;
import com.algoclash.series.event.MatchCompletedEvent;
import com.algoclash.user.User;
import com.algoclash.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchFinalizationService {

    private final MatchRepository matchRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean finalize(Long matchId, Long winnerId) {
        Match match = matchRepository.findByIdForUpdate(matchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Match not found with id: " + matchId));

        if (match.getState() == MatchState.COMPLETED || match.getWinner() != null) {
            log.info("Match {} is already completed with winner {}, ignoring winner settlement for user {}",
                    matchId, match.getWinner() != null ? match.getWinner().getId() : "null", winnerId);
            return false;
        }

        User winner = userRepository.findById(winnerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Winner user not found with id: " + winnerId));

        Long loserId = null;
        if (match.getPlayer1() != null && match.getPlayer1().getId().equals(winnerId)) {
            if (match.getPlayer2() != null) {
                loserId = match.getPlayer2().getId();
            }
        } else if (match.getPlayer2() != null && match.getPlayer2().getId().equals(winnerId)) {
            if (match.getPlayer1() != null) {
                loserId = match.getPlayer1().getId();
            }
        }

        match.setWinner(winner);
        match.setState(MatchState.COMPLETED);
        match.setEndedAt(LocalDateTime.now());
        matchRepository.save(match);

        Long seriesId = match.getSeries() != null ? match.getSeries().getId() : null;
        log.info("Match {} finalized successfully. Winner: {}, Loser: {}, Series: {}",
                matchId, winnerId, loserId, seriesId);

        eventPublisher.publishEvent(new MatchCompletedEvent(match.getId(), winner.getId(), loserId, seriesId));
        return true;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean finalizeMatch(Long matchId, Long winnerId) {
        return finalize(matchId, winnerId);
    }
}
