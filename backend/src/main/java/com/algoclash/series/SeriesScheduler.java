package com.algoclash.series;

import com.algoclash.match.Match;
import com.algoclash.match.MatchRepository;
import com.algoclash.match.MatchState;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class SeriesScheduler {

    private static final long MATCH_TIMEOUT_HOURS = 24;

    private final SeriesRepository seriesRepository;
    private final MatchRepository matchRepository;
    private final SeriesService seriesService;

    @Scheduled(fixedDelay = 10_000)
    @Transactional
    public void startDueSeries() {
        LocalDateTime now = LocalDateTime.now();

        List<Series> dueSeries = seriesRepository.findByStatusAndStartsAtBefore(
                SeriesStatus.REGISTRATION_CLOSED, now);

        for (Series series : dueSeries) {
            if (series.getParticipants() == null || series.getParticipants().size() != series.getSize()) {
                continue;
            }

            List<Match> round1 = matchRepository.findBySeriesAndRoundOrderByIdAsc(series, 1);
            if (round1.isEmpty()) {
                seriesService.generateRound1Matches(series);
                round1 = matchRepository.findBySeriesAndRoundOrderByIdAsc(series, 1);
            }

            series.setStatus(SeriesStatus.ONGOING);
            series.setCurrentRound(1);

            for (Match match : round1) {
                if (match.getState() == MatchState.PENDING) {
                    match.setState(MatchState.ONGOING);
                    match.setStartedAt(now);
                }
            }
            log.info("Series {} started — {} round-1 matches activated", series.getId(), round1.size());
        }
    }

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void cancelTimedOutMatches() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(MATCH_TIMEOUT_HOURS);
        List<Match> stale = matchRepository.findOngoingStartedBefore(cutoff);

        for (Match match : stale) {
            match.setState(MatchState.CANCELLED);
            match.setEndedAt(LocalDateTime.now());
            log.warn("Match {} cancelled — exceeded {}h timeout (started {})",
                    match.getId(), MATCH_TIMEOUT_HOURS, match.getStartedAt());
        }
    }
}
