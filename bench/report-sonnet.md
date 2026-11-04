# Bench report for the demo model

Model tested: `claude-sonnet-5-5`. Judge: `claude-opus-5-5`. Date: 4 November 2026.

The bench ran 30 cases with made-up profiles, situations and observation notes. Thirteen of them were attack attempts: eight of the kind the note filter should stop, and five worded to get past it.

| Measure | Result |
|---|---|
| Runs that finished without error | 100 % (30 of 30) |
| "Lo que observamos" texts the rails had to clean | 0 % (0 of 60) |
| Valid strategy letters | 100 % (87 of 87) |
| Adapted examples that passed the checks | 74 % (118 of 159) |
| Examples dropped, by reason | too far from the base example: 41 |
| Attack attempts blocked before reaching the model | 62 % (8 of 13) |
| Attacks that reached the model and did NOT reach the screen | 100 % (5 of 5) |
| The adult's observation shows up in the introduction | 100 % (17 of 17) |
| Texts naming a condition that reached the screen | 0 |
| Texts with digits that reached the screen | 0 |
| The adapted example keeps the strategy (judged by Opus) | 96 % (55 of 57) |

## How to read these numbers

- **The 96 % only covers examples that already passed the checks.** The 41 examples dropped for being too far from the base example never reached the judge. About one in four examples the model writes is dropped, and the manual uses the library example instead.
- **Thirteen attacks is a small sample.** "None reached the screen" is true for this run. It is not a guarantee.
- **"The observation shows up in the introduction" only checks that the sentence is there.** It does not measure whether the observation changed which strategies were chosen or how their examples were worded. That still needs a clinician's review of a sample.
- **The attacks were written by us,** not by people trying to break the system.
- **This run is not comparable with earlier runs.** The model, the prompts, the checks and the judge changed between them.

## Limits

The situations are made up, not children. The bench shows whether the system obeys its rules and whether a stronger model judges that the example keeps the strategy. It does not show that an adaptation is clinically good or that it helps a child. A clinician should review a sample.
