package com.algoclash.series;

import com.algoclash.match.Match;
import com.algoclash.match.MatchRepository;
import com.algoclash.problem.Problem;
import com.algoclash.problem.ProblemRepository;
import com.algoclash.series.bracket.BracketStrategyRegistry;
import com.algoclash.series.dto.*;
import com.algoclash.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SeriesService {

    private final SeriesRepository seriesRepository;
    private final MatchRepository matchRepository;
    private final ProblemRepository problemRepository;
    private final SeriesRoundConfigRepository roundConfigRepository;
    private final BracketStrategyRegistry bracketStrategyRegistry;

    @Transactional
    public SeriesSummaryResponse createSeries(CreateSeriesRequest request, User admin) {
        int size = request.getSize();
        if (!bracketStrategyRegistry.hasStrategyFor(size)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unsupported tournament size: " + size + ". Supported: any power of 2 (8, 16, 32...)");
        }

        if (request.getStartsAt() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startsAt is required");
        }
        if (request.getStartsAt().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startsAt must be in the future");
        }

        int rounds = (int) (Math.log(size) / Math.log(2));

        if (request.getRoundProblems() == null || request.getRoundProblems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Round problems configuration is required");
        }

        for (int r = 1; r <= rounds; r++) {
            if (!request.getRoundProblems().containsKey(r)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing problem mapping for round " + r);
            }
        }

        Series series = Series.builder()
                .name(request.getName())
                .size(size)
                .status(SeriesStatus.REGISTRATION_OPEN)
                .currentRound(1)
                .startsAt(request.getStartsAt())
                .build();

        Series saved = seriesRepository.save(series);

        for (int r = 1; r <= rounds; r++) {
            Long problemId = request.getRoundProblems().get(r);
            Problem problem = problemRepository.findById(problemId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Problem not found: " + problemId));

            SeriesRoundConfig cfg = SeriesRoundConfig.builder()
                    .series(saved)
                    .roundNumber(r)
                    .problem(problem)
                    .build();

            roundConfigRepository.save(cfg);
        }

        return toSummaryResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<SeriesSummaryResponse> getAllSeriesSummaries(Pageable pageable) {
        return seriesRepository.findAll(pageable).map(this::toSummaryResponse);
    }

    @Transactional(readOnly = true)
    public SeriesDetailResponse getSeriesDetail(Long id) {
        Series series = seriesRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Series not found"));

        List<Match> matches = List.of();

        if (series.getStatus() == SeriesStatus.ONGOING || series.getStatus() == SeriesStatus.COMPLETED) {
            matches = matchRepository.findBySeriesOrderByRoundAscIdAsc(series);
        }

        return toDetailResponse(series, matches);
    }

    @Transactional
    public SeriesDetailResponse joinSeries(Long seriesId, User currentUser) {
        Series series = seriesRepository.findById(seriesId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Series not found"));

        if (series.getStatus() != SeriesStatus.REGISTRATION_OPEN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Series is not open for registration");
        }

        if (series.getParticipants().contains(currentUser)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You already joined this series");
        }

        if (series.getParticipants().size() >= series.getSize()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Series is already full");
        }

        series.getParticipants().add(currentUser);
        seriesRepository.save(series);

        if (series.getParticipants().size() == series.getSize()) {
            series.setStatus(SeriesStatus.REGISTRATION_CLOSED);
            seriesRepository.save(series);
        }

        List<Match> matches = matchRepository.findBySeriesOrderByRoundAscIdAsc(series);
        return toDetailResponse(series, matches);
    }

    @Transactional
    public void generateRound1Matches(Series series) {
        Problem round1Problem = roundConfigRepository.findBySeriesOrderByRoundNumberAsc(series).stream()
                .filter(c -> c.getRoundNumber() == 1)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Round 1 problem not configured for series " + series.getId()))
                .getProblem();

        List<Match> matches = bracketStrategyRegistry
                .forSize(series.getSize())
                .generateFirstRound(series, new ArrayList<>(series.getParticipants()), round1Problem);

        matchRepository.saveAll(matches);
    }

    private SeriesSummaryResponse toSummaryResponse(Series series) {
        int joinedCount = (series.getParticipants() == null)
                ? 0
                : series.getParticipants().size();

        return SeriesSummaryResponse.builder()
                .id(series.getId())
                .name(series.getName())
                .size(series.getSize())
                .joinedCount(joinedCount)
                .status(series.getStatus())
                .currentRound(series.getCurrentRound())
                .startsAt(series.getStartsAt())
                .build();
    }

    private SeriesDetailResponse toDetailResponse(Series series, List<Match> matches) {
        int joinedCount = (series.getParticipants() == null)
                ? 0
                : series.getParticipants().size();

        List<ParticipantDto> participants = series.getParticipants()
                .stream()
                .map(this::toParticipantDto)
                .sorted(Comparator.comparing(ParticipantDto::getUsername))
                .collect(Collectors.toList());

        Map<Integer, List<Match>> matchesByRound = matches.stream()
                .collect(Collectors.groupingBy(Match::getRound, TreeMap::new, Collectors.toList()));

        List<RoundDto> rounds = matchesByRound.entrySet()
                .stream()
                .map(entry -> {
                    int roundNumber = entry.getKey();
                    List<MatchSummaryDto> matchDtos = entry.getValue()
                            .stream()
                            .map(this::toMatchSummaryDto)
                            .collect(Collectors.toList());
                    return RoundDto.builder()
                            .roundNumber(roundNumber)
                            .matches(matchDtos)
                            .build();
                })
                .collect(Collectors.toList());

        return SeriesDetailResponse.builder()
                .id(series.getId())
                .name(series.getName())
                .size(series.getSize())
                .status(series.getStatus())
                .currentRound(series.getCurrentRound())
                .joinedCount(joinedCount)
                .startsAt(series.getStartsAt())
                .participants(participants)
                .rounds(rounds)
                .build();
    }

    private ParticipantDto toParticipantDto(User user) {
        return ParticipantDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .rating(user.getRating())
                .build();
    }

    private MatchSummaryDto toMatchSummaryDto(Match match) {
        Long winnerId = (match.getWinner() != null) ? match.getWinner().getId() : null;

        return MatchSummaryDto.builder()
                .id(match.getId())
                .problemId(match.getProblem().getId())
                .problemTitle(match.getProblem().getTitle())
                .player1Id(match.getPlayer1().getId())
                .player1Username(match.getPlayer1().getUsername())
                .player2Id(match.getPlayer2().getId())
                .player2Username(match.getPlayer2().getUsername())
                .state(match.getState().name())
                .winnerId(winnerId)
                .build();
    }
}
