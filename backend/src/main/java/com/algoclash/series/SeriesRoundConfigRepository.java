package com.algoclash.series;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SeriesRoundConfigRepository extends JpaRepository<SeriesRoundConfig, Long> {
    List<SeriesRoundConfig> findBySeriesOrderByRoundNumberAsc(Series series);
}
