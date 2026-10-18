package com.algoclash.series;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface SeriesRepository extends JpaRepository<Series, Long> {
    List<Series> findByStatusAndStartsAtBefore(SeriesStatus status, LocalDateTime time);
}
