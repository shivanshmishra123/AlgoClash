package com.algoclash.problem.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProblemResponse {

    private Long id;
    private String title;
    private String description;
    private String difficulty;
    private Integer timeLimitMillis;
    private Integer memoryLimitMb;
    private String sampleInput;
    private String sampleOutput;
    private String testcasesJson;
    private String createdByUsername;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
