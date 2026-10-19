package com.algoclash.match.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchmakingResponse {
    private String status; // QUEUED, MATCHED, IDLE, CANCELLED
    private Long matchId;
    private String opponentUsername;
    private Integer opponentRating;
    private Integer userRating;
    private Integer minRating;
    private Integer maxRating;
    private String message;
}
