package com.algoclash.series.bracket;

import com.algoclash.match.Match;
import com.algoclash.match.MatchState;
import com.algoclash.problem.Problem;
import com.algoclash.series.Series;
import com.algoclash.user.User;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class SingleEliminationBracketStrategy implements BracketStrategy {

    @Override
    public boolean supports(int size) {
        return size >= 2 && (size & (size - 1)) == 0;
    }

    @Override
    public List<Match> generateFirstRound(Series series, List<User> participants, Problem problem) {
        List<User> shuffled = new ArrayList<>(participants);
        Collections.shuffle(shuffled);
        return pairUp(series, shuffled, 1, problem);
    }

    @Override
    public List<Match> generateNextRound(Series series, List<User> winners, int roundNumber, Problem problem) {
        return pairUp(series, winners, roundNumber, problem);
    }

    private List<Match> pairUp(Series series, List<User> players, int round, Problem problem) {
        List<Match> matches = new ArrayList<>();
        for (int i = 0; i < players.size(); i += 2) {
            matches.add(Match.builder()
                    .series(series)
                    .problem(problem)
                    .player1(players.get(i))
                    .player2(players.get(i + 1))
                    .round(round)
                    .state(MatchState.PENDING)
                    .build());
        }
        return matches;
    }
}
