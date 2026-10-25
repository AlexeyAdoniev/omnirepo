# omnirepo

A TypeScript repository abstraction with pluggable storage and cache adapters.

## Installation

The `dist` branch contains the latest built package. Add it to another project's `package.json`:

```json
{
  "dependencies": {
    "omnirepo": "github:AlexeyAdoniev/omnirepo#dist"
  }
}
```

The GitHub Actions workflow updates `dist` after each push to `main`.

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

