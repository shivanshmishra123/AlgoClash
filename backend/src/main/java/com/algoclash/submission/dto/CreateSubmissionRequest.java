package com.algoclash.submission.dto;

import com.algoclash.submission.SubmissionLanguage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSubmissionRequest {

    @NotNull(message = "Language is required")
    private SubmissionLanguage language;

    @NotBlank(message = "Code cannot be blank")
    private String code;
}
