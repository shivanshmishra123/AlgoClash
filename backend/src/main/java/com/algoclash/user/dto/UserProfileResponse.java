package com.algoclash.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private Long id;
    private String username;
    private String email;
    private String role;
    private int rating;
    private int wins;
    private int losses;
    private double winRate;
    private LocalDateTime createdAt;
    private List<RecentMatchDto> recentMatches;
}
