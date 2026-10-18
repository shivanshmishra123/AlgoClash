package com.algoclash.match;

import com.algoclash.series.Series;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MatchRepository extends JpaRepository<Match, Long> {

    List<Match> findBySeriesOrderByRoundAscIdAsc(Series series);

    List<Match> findBySeriesAndRoundOrderByIdAsc(Series series, int round);

    List<Match> findTop10ByPlayer1IdOrPlayer2IdOrderByEndedAtDescCreatedAtDesc(Long player1Id, Long player2Id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM Match m WHERE m.id = :id")
    Optional<Match> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT m FROM Match m WHERE m.state = 'ONGOING' AND m.startedAt < :cutoff")
    List<Match> findOngoingStartedBefore(@Param("cutoff") LocalDateTime cutoff);
}
