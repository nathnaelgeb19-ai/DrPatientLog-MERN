# Architecture

React/Vite frontend → Express REST API → Mongoose/MongoDB.

Authentication uses an HTTP-only JWT cookie. The API enforces doctor ownership for patient records and admin checks for management/backup operations.

The application deliberately does not connect to the existing Neon database. This lets the MERN version be tested independently before any production migration.
