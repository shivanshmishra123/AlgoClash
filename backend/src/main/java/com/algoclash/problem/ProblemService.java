package com.algoclash.problem;

import com.algoclash.problem.dto.CreateProblemRequest;
import com.algoclash.problem.dto.ProblemResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProblemService {

    private final ProblemRepository problemRepository;

    @Transactional
    public ProblemResponse createProblem(CreateProblemRequest request) {
        Problem problem = mapToEntity(request);
        Problem saved = problemRepository.save(problem);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ProblemResponse> getAllProblems() {
        return problemRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProblemResponse getProblemById(Long id) {
        Problem problem = problemRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Problem not found with id: " + id));
        return mapToResponse(problem);
    }

    private Problem mapToEntity(CreateProblemRequest req) {
        ProblemDifficulty difficulty =
                (req.getDifficulty() != null) ? req.getDifficulty() : ProblemDifficulty.EASY;

        int timeLimit = (req.getTimeLimitMillis() != null) ? req.getTimeLimitMillis() : 1000;
        int memoryLimit = (req.getMemoryLimitMb() != null) ? req.getMemoryLimitMb() : 256;

        return Problem.builder()
                .title(req.getTitle())
                .description(req.getDescription())
                .difficulty(difficulty)
                .timeLimitMillis(timeLimit)
                .memoryLimitMb(memoryLimit)
                .sampleInput(req.getSampleInput())
                .sampleOutput(req.getSampleOutput())
                .testcasesJson(req.getTestcasesJson())
                .build();
    }

    private ProblemResponse mapToResponse(Problem p) {
        return ProblemResponse.builder()
                .id(p.getId())
                .title(p.getTitle())
                .description(p.getDescription())
                .difficulty(p.getDifficulty().name())
                .timeLimitMillis(p.getTimeLimitMillis())
                .memoryLimitMb(p.getMemoryLimitMb())
                .sampleInput(p.getSampleInput())
                .sampleOutput(p.getSampleOutput())
                .testcasesJson(p.getTestcasesJson())
                .createdByUsername(null)
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
