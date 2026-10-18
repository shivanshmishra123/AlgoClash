package com.algoclash.series.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
public class CreateSeriesRequest {
    private String name;
    private int size;
    private LocalDateTime startsAt;
    private Map<Integer, Long> roundProblems;
}
