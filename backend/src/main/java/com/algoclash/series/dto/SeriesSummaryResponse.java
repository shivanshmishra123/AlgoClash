package com.algoclash.series.dto;

import com.algoclash.series.SeriesStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeriesSummaryResponse {
    private Long id;
    private String name;
    private int size;
    private int joinedCount;
    private SeriesStatus status;
    private int currentRound;
    private LocalDateTime startsAt;
}
