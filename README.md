# omnirepo

A TypeScript repository abstraction with pluggable storage and cache adapters.

## Structure

- `src/index.ts`: public entrypoint
- `src/types.ts`: shared library types
- `src/repository/`: repository implementation and fluent builder
- `src/stores/`: in-memory storage and cache adapters, plus a Redis hash cache
- `test/`: unit and integration tests

# RUN tests

- yarn test

# RUN sandbox

- docker build -t omnirepo-example .
- docker run --rm -p 27017:27017 -p 6379:6379 omnirepo-example
