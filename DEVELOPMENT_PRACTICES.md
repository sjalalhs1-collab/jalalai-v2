# JalalAI Development Practices

## Honesty note on where this comes from
The user asked to bring in the "superpowers" skill's working methodology. The actual
`superpowers` skill files (brainstorming, writing-plans, subagent-driven-development,
test-driven-development, systematic-debugging, requesting-code-review, receiving-code-review,
verification-before-completion, using-git-worktrees, dispatching-parallel-agents,
finishing-a-development-branch) were **never uploaded to this project** — only their names,
referenced secondhand in `SJALALAI-JalalAI-handoff.md` and `JalalAI-Master-Structure.md`. There is
no file content to import. What follows is this project's own practice, organized under the same
publicly-known practice names, matched honestly against what has actually happened in this
codebase's history (see `RELEASE_NOTES.txt` for the receipts) — not a reproduction of someone
else's skill files.

## The practices, and where this project has actually followed them

**Plan before building.** Every release in `RELEASE_NOTES.txt` states what was broken or missing
before describing what was added — the gap was identified before code was written, not after.

**Test-driven, not test-decorated.** `npm test` runs 93 real tests: unit tests for password
hashing, session expiry, entitlement limits, payment-gateway signature verification, and HTTP
integration tests that spawn the actual compiled server and hit it over the network. Every backend
feature added since v1.9.10 shipped with tests in the same change, not after the fact.

**Systematic debugging over guessing.** When a screenshot of the homepage looked broken (v1.9.15),
the response was not to assume the code was wrong — it was to isolate the variable: test
`classList.toggle` alone, test `async function` alone, in the same renderer, until the actual cause
(the local screenshot tool's ancient JS engine, not the shipped code) was proven, not guessed.

**Verification before claiming completion.** Every release in this project's history has been
rebuilt from a clean `dist/`, tested, packaged into a zip, then **re-extracted into a fresh
directory and tested again** before being handed over. "It works on my machine" is not the bar —
"it works from a cold unzip" is.

**Code review as self-audit.** Before the identity/entitlement system was built, the existing
codebase was audited first (`docs/GATE_B_IDENTITY_ENTITLEMENTS.md` "Implementation status"
sections, `NEXT_LEVEL_EXECUTION_BACKLOG.md` gap tracking) rather than assuming a clean slate.

**Finishing, not abandoning, a line of work.** Each version bump in `RELEASE_NOTES.txt` explicitly
lists what's still open under "Not done" — work isn't marked complete until it's verified, and
what's genuinely unfinished is named, not hidden.

## What this project does NOT claim
This is not the actual `superpowers` skill. It is this project's own discipline, described using
the same widely-recognized practice names because they're accurate descriptions of what happened,
not because any file was copied. If the real `superpowers` skill files are ever uploaded, they
should be read and compared against this document — some of it may already be more specific and
useful than what's written here.
