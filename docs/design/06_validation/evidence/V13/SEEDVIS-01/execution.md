# V13-SEEDVIS-01 execution evidence

## 5W1H brief
- What: Constrain `seed-visual --check` to seed-owned id ranges only.
- Why: Manual residual rows outside seed ownership should not fail visual seed self-checks.
- Where: `prisma/seed-visual.ts`; evidence under `docs/design/06_validation/evidence/V13/SEEDVIS-01/`.
- When: 2026-10-27 Asia/Shanghai, after V13-BASE-01 closeout.
- Who: Current execution agent.
- How: Exact seed ids are generated first, then checked with `findMany({ id in seedIds })`; rows in the visual id range but outside those exact ids are printed as warnings only.

## Files changed
- `prisma/seed-visual.ts`
- `docs/design/06_validation/evidence/V13/SEEDVIS-01/execution.md`
- `docs/V1.3-20261026/state.json`
- `docs/V1.3-20261026/EXEC-log.md`

## Implementation summary
- Replaced broad `count({ id: { gte: 9000, lt: 10000 } })` checks with `findMany({ id: { in: seedIds } })`.
- Kept expected values from `counts.json`; CampusImage still derives expected count from generated rows.
- Wording changed so non-seed rows in the visual id range are warnings, not failures.
- Wording changed so failures mean missing/extra rows within exact seed id ownership.

## Verification commands and results
```text
npx tsx prisma/seed-visual.ts --check
EXIT:0
Seed id counts match counts.json for all tables

npx tsx prisma/seed-visual.ts --check after inserting Article id=9226
EXIT:0
Article warning printed: 1 non-seed row(s) in visual id range, id=9226

npx tsx prisma/seed-visual.ts --check after deleting seed Article id=9225
EXIT:1
Article expected 25, actual 24, seed id count drift reported

After restoring Article id=9225:
npx tsx prisma/seed-visual.ts --check
EXIT:0
Seed id counts match counts.json for all tables

npm run lint
EXIT:0

npm run typecheck
EXIT:0

npm test
EXIT:0
91 files / 1859 tests passed
```

## Acceptance checklist
- [x] Local dirty/non-seed row `Article 9226` exits 0 and prints warning.
- [x] Missing seed row `Article 9225` exits 1.
- [x] `counts.json` values unchanged.
- [x] Seed content unchanged.
- [x] Does not alter visual CI `--check || seed` behavior: CI self-check now validates seed ownership only, then writes seed data if drift exists.


## CI closeout update
- CI run: `https://github.com/CodingHeader/HDwebsite/actions/runs/40424372749`
- Jobs: `docker` success, `gate` success, `visual` failure.
- E2E artifact: `e2e-results-40424372749` results.json = `{'passed': 79}`.
- Visual artifact: `visual-results-40424372749` results.json = `{'passed': 45, 'failed': 1}`; remaining visual failure stays owned by `V13-VIS-01`.
- Conclusion: SEEDVIS scope is closed after local positive/negative checks and CI gate/e2e evidence.
