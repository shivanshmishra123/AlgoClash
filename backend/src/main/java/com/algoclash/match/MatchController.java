package com.algoclash.match;

import com.algoclash.common.SecurityUtils;
import com.algoclash.match.dto.MatchResponse;
import com.algoclash.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;
    private final SecurityUtils securityUtils;

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MatchResponse> getMatch(@PathVariable("id") Long id) {
        User currentUser = securityUtils.getCurrentUser();
        MatchResponse response = matchService.getMatchResponse(id, currentUser.getId());
        return ResponseEntity.ok(response);
    }
}
