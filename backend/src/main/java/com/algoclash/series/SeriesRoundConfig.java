package com.algoclash.series;

import com.algoclash.problem.Problem;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "series_round_config",
       uniqueConstraints = @UniqueConstraint(columnNames = {"series_id", "round_number"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeriesRoundConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "series_id")
    private Series series;

    @Column(name = "round_number", nullable = false)
    private int roundNumber;

    @ManyToOne(optional = false)
    @JoinColumn(name = "problem_id")
    private Problem problem;
}
