package com.algoclash.submission;

import com.algoclash.common.SecurityUtils;
import com.algoclash.submission.dto.CreateSubmissionRequest;
import com.algoclash.submission.dto.SubmissionResponse;
import com.algoclash.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
public class SubmissionController {

    private final SubmissionService submissionService;
    private final SecurityUtils securityUtils;

    @PostMapping("/{matchId}/submissions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SubmissionResponse> createSubmission(
            @PathVariable("matchId") Long matchId,
            @Valid @RequestBody CreateSubmissionRequest request) {
        User currentUser = securityUtils.getCurrentUser();
        SubmissionResponse response = submissionService.createSubmission(matchId, request, currentUser);
        return ResponseEntity.ok(response);
    }
}
