package com.algoclash.match;

import com.algoclash.common.SecurityUtils;
import com.algoclash.match.dto.MatchmakingResponse;
import com.algoclash.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/matchmaking")
@RequiredArgsConstructor
public class MatchmakingController {

    private final MatchmakingService matchmakingService;
    private final SecurityUtils securityUtils;

    @PostMapping("/join")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MatchmakingResponse> joinQueue() {
        User user = securityUtils.getCurrentUser();
        return ResponseEntity.ok(matchmakingService.joinQueue(user));
    }

    @PostMapping("/leave")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MatchmakingResponse> leaveQueue() {
        User user = securityUtils.getCurrentUser();
        return ResponseEntity.ok(matchmakingService.leaveQueue(user));
    }

    @GetMapping("/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MatchmakingResponse> getStatus() {
        User user = securityUtils.getCurrentUser();
        return ResponseEntity.ok(matchmakingService.getStatus(user));
    }

    @PostMapping("/bot")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MatchmakingResponse> matchWithBot() {
        User user = securityUtils.getCurrentUser();
        return ResponseEntity.ok(matchmakingService.matchWithBot(user));
    }
}
