# Expo app, local-only, no backend

Globe trotter is a single-user, single-device app with no account and no sync; data leaves the phone only through an explicit export. We build it as an Expo (React Native) + TypeScript app with on-device SQLite storage, and drop the initial Python package scaffold: with nothing to serve, a Python backend would have no job.

## Consequences

Adding multi-device sync later means introducing a backend and an identity model from scratch, so the storage layer should keep stable Place ids that a future sync could reuse.
