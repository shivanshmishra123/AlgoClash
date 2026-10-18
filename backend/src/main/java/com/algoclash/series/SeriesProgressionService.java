package com.algoclash.series;

import com.algoclash.match.Match;
import com.algoclash.match.MatchRepository;
import com.algoclash.match.MatchState;
import com.algoclash.problem.Problem;
import com.algoclash.series.bracket.BracketStrategyRegistry;
import com.algoclash.series.event.MatchCompletedEvent;
import com.algoclash.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SeriesProgressionService {

    private final SeriesRepository seriesRepository;
    private final MatchRepository matchRepository;
    private final SeriesRoundConfigRepository roundConfigRepository;
    private final BracketStrategyRegistry bracketStrategyRegistry;

    @EventListener
    @Transactional
    public void onMatchCompleted(MatchCompletedEvent event) {
        Series series = seriesRepository.findById(event.seriesId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Series not found"));
        advanceSeries(series);
    }

    private void advanceSeries(Series series) {
        int currentRound = series.getCurrentRound();
        List<Match> roundMatches = matchRepository.findBySeriesAndRoundOrderByIdAsc(series, currentRound);

        if (roundMatches.isEmpty()) return;

        boolean roundComplete = roundMatches.stream()
                .allMatch(m -> m.getState() == MatchState.COMPLETED && m.getWinner() != null);

        if (!roundComplete) return;

        int maxRounds = (int) (Math.log(series.getSize()) / Math.log(2));

        if (currentRound >= maxRounds) {
            series.setStatus(SeriesStatus.COMPLETED);
            seriesRepository.save(series);
            log.info("Series {} is fully COMPLETED!", series.getId());
            return;
        }

        List<User> winners = roundMatches.stream()
                .map(Match::getWinner)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        int nextRound = currentRound + 1;

        Problem nextProblem = roundConfigRepository.findBySeriesOrderByRoundNumberAsc(series).stream()
                .filter(cfg -> cfg.getRoundNumber() == nextRound)
                .findFirst()
                .map(SeriesRoundConfig::getProblem)
                .orElseThrow(() -> new IllegalStateException(
                        "Problem not configured for round " + nextRound + " of series " + series.getId()));

        List<Match> nextMatches = bracketStrategyRegistry
                .forSize(series.getSize())
                .generateNextRound(series, winners, nextRound, nextProblem);

        matchRepository.saveAll(nextMatches);

        series.setCurrentRound(nextRound);
        series.setStatus(SeriesStatus.ONGOING);
        seriesRepository.save(series);

        log.info("Series {} advanced to round {}, {} matches generated",
                series.getId(), nextRound, nextMatches.size());
    }
}
