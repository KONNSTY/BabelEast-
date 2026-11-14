---
name: refactor
description: Analyze code, refactor it safely, verify with tests, and review the result. Use when the user invokes /refactor or asks to clean a module without drifting from the requested behavior.
disable-model-invocation: true
---

# Refactor

Run these phases in order. Do not skip verification.

## 1. Analyze

Read the code that the request names. If none is named, start from the files already under discussion. List smells and bugs before editing:

- unclear names, god modules, duplicated rules
- behavior that contradicts the product (fake progress, dead controls, leaked answers)
- security issues (auth, grants, caching, injection)
- tests that do not exercise the real rules

## 2. Refactor

- Extract pure rules before rewriting UI so behavior can be tested.
- Change one concern at a time: structure, then correctness, then security.
- Keep intended product behavior. Fix bugs that make the product lie, break, or leak.
- Do not add features that the empty states already say are unfinished.
- Format code so the next reader can follow it. No one-line modules.

## 3. Verify

Run the project gates that cover the change. For this repo that is `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build`. Add or update tests for every rule you extract or change. If a gate fails, fix the cause and run it again.

## 4. Review

Re-read the diff. Check for regressions, unused exports, behavior you did not mean to change, and tests that assert constants instead of the implementation. Do not claim the refactor is done until the gates pass.
