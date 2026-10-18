package com.algoclash.series.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchSummaryDto {
    private Long id;
    private Long problemId;
    private String problemTitle;
    private Long player1Id;
    private String player1Username;
    private Long player2Id;
    private String player2Username;
    private String state;
    private Long winnerId;
}
