package com.algoclash.series.event;

public record MatchCompletedEvent(
        Long matchId,
        Long winnerId,
        Long loserId,
        Long seriesId
) {}
