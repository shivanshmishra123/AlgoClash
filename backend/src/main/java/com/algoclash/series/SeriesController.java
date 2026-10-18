package com.algoclash.series;

import com.algoclash.series.dto.CreateSeriesRequest;
import com.algoclash.series.dto.SeriesDetailResponse;
import com.algoclash.series.dto.SeriesSummaryResponse;
import com.algoclash.user.User;
import com.algoclash.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/series")
@RequiredArgsConstructor
public class SeriesController {

    private final SeriesService seriesService;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SeriesSummaryResponse> createSeries(@RequestBody CreateSeriesRequest request) {
        User currentUser = getCurrentUser();
        SeriesSummaryResponse response = seriesService.createSeries(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<Page<SeriesSummaryResponse>> getAllSeries(
            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(seriesService.getAllSeriesSummaries(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SeriesDetailResponse> getSeriesById(@PathVariable Long id) {
        SeriesDetailResponse detail = seriesService.getSeriesDetail(id);
        return ResponseEntity.ok(detail);
    }

    @PostMapping("/{id}/join")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SeriesDetailResponse> joinSeries(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        SeriesDetailResponse detail = seriesService.joinSeries(id, currentUser);
        return ResponseEntity.ok(detail);
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Unauthenticated");
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof User u) {
            return u;
        }

        String username = null;
        if (principal instanceof UserDetails ud) {
            username = ud.getUsername();
        } else if (principal instanceof String s) {
            username = s;
        }

        if (username == null || username.isBlank()) {
            throw new IllegalStateException("Authenticated principal has no username");
        }

        final String uname = username;
        return userRepository.findByUsername(uname)
                .orElseThrow(() -> new IllegalStateException("User not found for principal username: " + uname));
    }
}
