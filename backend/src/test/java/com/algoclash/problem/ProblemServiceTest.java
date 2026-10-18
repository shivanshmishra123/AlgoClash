package com.algoclash.problem;

import com.algoclash.problem.dto.CreateProblemRequest;
import com.algoclash.problem.dto.ProblemResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProblemServiceTest {

    @Mock
    private ProblemRepository problemRepository;

    @InjectMocks
    private ProblemService problemService;

    private Problem sampleProblem;

    @BeforeEach
    void setUp() {
        sampleProblem = Problem.builder()
                .id(1L)
                .title("Two Sum")
                .description("Find two indices...")
                .sampleInput("[2,7,11,15]\n9")
                .sampleOutput("[0,1]")
                .difficulty(ProblemDifficulty.EASY)
                .testcasesJson("[{\"input\":\"2 7 11 15\\n9\",\"expectedOutput\":\"0 1\"}]")
                .build();
    }

    @Test
    @DisplayName("createProblem maps DTO and saves entity")
    void createProblem_Success() {
        CreateProblemRequest request = new CreateProblemRequest();
        request.setTitle("Two Sum");
        request.setDescription("Find two indices...");
        request.setSampleInput("[2,7,11,15]\n9");
        request.setSampleOutput("[0,1]");
        request.setDifficulty(ProblemDifficulty.EASY);
        request.setTestcasesJson("[{\"input\":\"2 7 11 15\\n9\",\"expectedOutput\":\"0 1\"}]");

        when(problemRepository.save(any(Problem.class))).thenReturn(sampleProblem);

        ProblemResponse response = problemService.createProblem(request);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getTitle()).isEqualTo("Two Sum");
        assertThat(response.getDifficulty()).isEqualTo("EASY");
        verify(problemRepository).save(any(Problem.class));
    }

    @Test
    @DisplayName("getProblemById returns problem when found")
    void getProblemById_Found() {
        when(problemRepository.findById(1L)).thenReturn(Optional.of(sampleProblem));

        ProblemResponse response = problemService.getProblemById(1L);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getTitle()).isEqualTo("Two Sum");
    }

    @Test
    @DisplayName("getProblemById throws 404 when not found")
    void getProblemById_NotFound() {
        when(problemRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> problemService.getProblemById(99L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }

    @Test
    @DisplayName("getAllProblems returns list of responses")
    void getAllProblems_Success() {
        when(problemRepository.findAll()).thenReturn(List.of(sampleProblem));

        List<ProblemResponse> list = problemService.getAllProblems();

        assertThat(list).hasSize(1);
        assertThat(list.get(0).getTitle()).isEqualTo("Two Sum");
    }
}
