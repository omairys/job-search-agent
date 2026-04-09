Create a new source connector for: $ARGUMENTS

Steps:
1. Create `sources/$ARGUMENTS.ts` with the function `fetch${capitalize($ARGUMENTS)}(searchParams: SearchParams): Promise<Job[]>`
2. The function must return an array of Job normalized to the internal schema (see CLAUDE.md and types.ts)
3. Include error handling with try/catch and log to logs/errors.log
4. Create `sources/test-$ARGUMENTS.ts` that tests the function and prints the first 5 results
5. Add the import and fetch to the Promise.allSettled in run.ts
6. Update CLAUDE.md with the new source
