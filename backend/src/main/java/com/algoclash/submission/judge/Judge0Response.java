package com.algoclash.submission.judge;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Judge0Response {

    private String token;
    private String stdout;
    private String stderr;

    @JsonProperty("compile_output")
    private String compileOutput;

    private String message;
    private Judge0Status status;
    private String time;
    private Object memory;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Judge0Status {
        private Integer id;
        private String description;
    }
}
