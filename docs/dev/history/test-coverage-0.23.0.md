# Test coverage by feature area - Kept GTD 0.23.0

Unit, UI, Scenario: tests per kind (smoke counted again in its own column). Scenarios: catalogued
scenarios (`docs/dev/test-scenarios.md`). Line % and Branch %: of the area's source files.
Δ: line and branch points against `scripts/coverage-baseline.json`.

| Area | Unit | UI | Scenario | Smoke | Scenarios | Src lines | Line % | Branch % | Δ vs baseline |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Integrations (experimental) (`integrations`) | 5 | 0 | 0 | 0 | 0 | 988 | 15.9 | 8.8 | +0.0 / +0.0 |
| Daily, Week and Month (`planning`) | 25 | 0 | 14 | 5 | 14 | 841 | 81.1 | 71.1 | +0.0 / +0.0 |
| Contexts (`contexts`) | 17 | 0 | 5 | 0 | 5 | 215 | 90.7 | 84.5 | -0.7 / +0.0 |
| Engage (`engage`) | 143 | 28 | 11 | 1 | 11 | 865 | 96.5 | 90.7 | +0.0 / +0.0 |
| Close out and archive (`close-out`) | 13 | 0 | 1 | 0 | 1 | 1239 | 68.7 | 47.1 | +0.0 / +0.0 |
| Lasso capture and marks (`lasso`) | 86 | 19 | 1 | 1 | 1 | 1115 | 68.7 | 63.5 | -0.2 / -0.2 |
| Agreements (`agreements`) | 56 | 3 | 8 | 0 | 8 | 261 | 95.8 | 89.4 | +0.0 / +0.0 |
| Loops (`loops`) | 59 | 9 | 0 | 0 | 0 | 538 | 91.4 | 80.5 | +0.0 / +0.0 |
| Threads and tending (`threads`) | 121 | 23 | 2 | 0 | 2 | 911 | 89.7 | 80.5 | +0.0 / +0.0 |
| Weekly Review (`review`) | 25 | 7 | 2 | 1 | 2 | 1041 | 74.9 | 60.8 | +0.0 / -0.2 |
| Meetings and reflection (`meetings`) | 56 | 7 | 23 | 0 | 23 | 655 | 83.2 | 75.9 | +0.0 / +0.0 |
| Note setups, notebooks and pages (`note-setups`) | 285 | 24 | 15 | 0 | 15 | 2002 | 86.6 | 78.8 | +0.0 / +0.0 |
| Quick Add, item card and Inbox (`quick-add`) | 38 | 37 | 18 | 0 | 18 | 1750 | 80.9 | 75.8 | +0.0 / +0.0 |
| Projects and Areas, status and the Current page (`current-page`) | 13 | 4 | 5 | 1 | 5 | 842 | 68.6 | 60.5 | +0.0 / +0.0 |
| Tags (`tags`) | 44 | 9 | 0 | 0 | 0 | 294 | 92.9 | 88.6 | +0.0 / +0.0 |
| Your files: cache, writes, safety, integrity (`files`) | 209 | 17 | 13 | 1 | 13 | 1785 | 88.8 | 77.7 | +0.0 / +0.0 |
| Settings, profiles, demo, help and logging (`settings`) | 198 | 10 | 21 | 1 | 21 | 1675 | 83.7 | 73.0 | -0.1 / -0.2 |
| Foundation: shared UI, utils, device wrappers, App shell (`foundation`) | 17 | 37 | 1 | 1 | 1 | 991 | 88.7 | 77.7 | +0.0 / +0.0 |
| **All** | 1410 | 234 | 140 | 12 | 140 | 18008 | 79.0 | 70.7 | |
