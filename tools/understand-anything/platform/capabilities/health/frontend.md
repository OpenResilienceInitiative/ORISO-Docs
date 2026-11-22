---
scope: "*:{ORISO-Frontend,ORISO-Admin}/**"
inherits: default
metrics:
  crap: {threshold: 30, weight: 3}
tests:
  - npm run test:unit (ORISO-Frontend)
  - npm test (ORISO-Admin)
---
You review React and TypeScript code. The leading criterion is CRAP per function: cyclomatic complexity measured against test coverage, so that risky untested functions show up.

- Complexity comes from an AST pass over the function, coverage from the existing vitest coverage output.
- The threshold applies to each function. Report the functions above it, worst first, with file and line.
- A function with high complexity and full coverage is not a finding. A trivial function without a test is not a finding either.
- Do not suggest rewrites. Suggest the smallest test that would bring a function under the threshold.

The CRAP threshold of 30 is a proposal (ORISO-Docs#213, open question) and may change after the first runs. The other criteria are inherited from the default.
