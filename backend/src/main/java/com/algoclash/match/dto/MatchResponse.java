package com.algoclash.match.dto;

import com.algoclash.match.MatchState;
import com.algoclash.problem.dto.ProblemResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchResponse {

    private Long id;
    private Long seriesId;
    private String seriesName;
    private Integer round;
    private MatchState state;

    private Long player1Id;
    private String player1Username;
    private Long player2Id;
    private String player2Username;

    private Long opponentId;
    private String opponentUsername;

    private Long winnerId;
    private String winnerUsername;

    private ProblemResponse problem;

    private String latestSubmissionVerdict;
    private String latestSubmissionLanguage;
    private String latestSubmissionCode;

    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private LocalDateTime createdAt;
}
