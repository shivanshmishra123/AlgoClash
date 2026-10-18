package com.algoclash.series.dto;

import com.algoclash.series.SeriesStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeriesDetailResponse {
    private Long id;
    private String name;
    private int size;
    private SeriesStatus status;
    private int currentRound;
    private int joinedCount;
    private LocalDateTime startsAt;

    private List<ParticipantDto> participants;
    private List<RoundDto> rounds;
}
