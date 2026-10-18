package com.algoclash.series.bracket;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class BracketStrategyRegistry {

    private final List<BracketStrategy> strategies;

    public BracketStrategy forSize(int size) {
        return strategies.stream()
                .filter(s -> s.supports(size))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "No bracket strategy registered for tournament size " + size));
    }

    public boolean hasStrategyFor(int size) {
        return strategies.stream().anyMatch(s -> s.supports(size));
    }
}
