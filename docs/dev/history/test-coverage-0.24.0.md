# Test coverage by feature area - Kept GTD 0.24.0

Unit, UI, Scenario: tests per kind (smoke counted again in its own column). Scenarios: catalogued
scenarios (`docs/dev/test-scenarios.md`). Line % and Branch %: of the area's source files.
Δ: line and branch points against `scripts/coverage-baseline.json`.

| Area | Unit | UI | Scenario | Smoke | Scenarios | Src lines | Line % | Branch % | Δ vs baseline |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Integrations (experimental) (`integrations`) | 5 | 0 | 0 | 0 | 0 | 990 | 15.9 | 8.8 | +0.0 / +0.0 |
| Daily, Week and Month (`planning`) | 25 | 0 | 14 | 5 | 14 | 835 | 81.0 | 70.0 | -0.1 / -1.1 |
| Contexts (`contexts`) | 62 | 0 | 19 | 0 | 19 | 286 | 94.4 | 90.0 | +1.6 / +3.1 |
| Engage (`engage`) | 143 | 29 | 11 | 1 | 11 | 865 | 96.5 | 90.7 | +0.0 / +0.0 |
| Close out and archive (`close-out`) | 13 | 0 | 1 | 0 | 1 | 1239 | 69.0 | 47.1 | +0.0 / +0.0 |
| Lasso capture and marks (`lasso`) | 85 | 19 | 1 | 1 | 1 | 1105 | 68.4 | 63.3 | -0.5 / -0.4 |
| Agreements (`agreements`) | 56 | 3 | 8 | 0 | 8 | 261 | 95.8 | 89.4 | +0.0 / +0.0 |
| Loops (`loops`) | 59 | 9 | 0 | 0 | 0 | 538 | 91.4 | 80.5 | +0.0 / +0.0 |
| Threads and tending (`threads`) | 121 | 23 | 2 | 0 | 2 | 913 | 89.7 | 81.4 | +0.0 / +0.0 |
| Weekly Review (`review`) | 25 | 8 | 2 | 1 | 2 | 1044 | 77.1 | 63.2 | +0.0 / +0.0 |
| Meetings and reflection (`meetings`) | 56 | 7 | 23 | 0 | 23 | 669 | 82.7 | 75.9 | -0.5 / +0.0 |
| Note setups, notebooks and pages (`note-setups`) | 298 | 26 | 20 | 0 | 20 | 2027 | 87.7 | 80.3 | +0.0 / +0.0 |
| Quick Add, item card and Inbox (`quick-add`) | 38 | 39 | 18 | 0 | 18 | 1756 | 80.9 | 75.9 | +0.0 / +0.1 |
| Projects and Areas, status and the Current page (`current-page`) | 13 | 4 | 5 | 1 | 5 | 829 | 68.2 | 60.3 | -0.4 / -0.2 |
| Tags (`tags`) | 44 | 11 | 0 | 0 | 0 | 315 | 92.4 | 87.2 | -0.5 / -1.4 |
| Your files: cache, writes, safety, integrity (`files`) | 210 | 17 | 13 | 1 | 13 | 1790 | 89.4 | 77.7 | +0.3 / +0.0 |
| In-app updates (`updates`) | 66 | 0 | 8 | 0 | 8 | 275 | 96.7 | 94.6 | +0.0 / +0.0 |
| Settings, profiles, demo, help and logging (`settings`) | 209 | 14 | 35 | 1 | 33 | 1733 | 84.9 | 73.5 | +0.0 / +0.0 |
| Foundation: shared UI, utils, device wrappers, App shell (`foundation`) | 33 | 37 | 4 | 1 | 4 | 1067 | 89.4 | 79.0 | +0.1 / +0.4 |
| **All** | 1561 | 246 | 184 | 12 | 182 | 18537 | 79.9 | 71.7 | |
