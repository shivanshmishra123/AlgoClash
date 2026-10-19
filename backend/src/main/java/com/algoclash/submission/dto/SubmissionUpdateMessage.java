package com.algoclash.submission.dto;

import com.algoclash.submission.SubmissionLanguage;
import com.algoclash.submission.SubmissionVerdict;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmissionUpdateMessage {
    private Long id;
    private Long matchId;
    private Long userId;
    private String username;
    private SubmissionLanguage language;
    private SubmissionVerdict verdict;
    private LocalDateTime createdAt;
}
