package com.algoclash.submission;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    Optional<Submission> findTopByMatchIdAndUserIdOrderByCreatedAtDesc(Long matchId, Long userId);
}
