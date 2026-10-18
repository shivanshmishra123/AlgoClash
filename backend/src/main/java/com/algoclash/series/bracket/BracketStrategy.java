package com.algoclash.series.bracket;

import com.algoclash.match.Match;
import com.algoclash.problem.Problem;
import com.algoclash.series.Series;
import com.algoclash.user.User;

import java.util.List;

public interface BracketStrategy {

    boolean supports(int size);

    List<Match> generateFirstRound(Series series, List<User> participants, Problem problem);

    List<Match> generateNextRound(Series series, List<User> winners, int roundNumber, Problem problem);
}
