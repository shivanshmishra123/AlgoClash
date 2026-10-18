package com.algoclash.problem.dto;

import com.algoclash.problem.ProblemDifficulty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateProblemRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String description;

    private ProblemDifficulty difficulty;

    @Min(1)
    private Integer timeLimitMillis;

    @Min(1)
    private Integer memoryLimitMb;

    private String sampleInput;
    private String sampleOutput;

    private String testcasesJson;
}
