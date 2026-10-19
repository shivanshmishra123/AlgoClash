package com.algoclash.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecentMatchDto {
    private Long matchId;
    private Long seriesId;
    private String seriesName;
    private int round;
    private String opponentUsername;
    private String result;
    private LocalDateTime endedAt;
    private LocalDateTime createdAt;
}
