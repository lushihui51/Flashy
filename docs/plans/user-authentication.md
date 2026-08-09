# User Authentication

## Invariant

- Every API route to read or write user-owned data rejects reuqest without a valid Clerk JWT (Authentication)
- Only rows whose user_id matches the logged-in user's can be created, read, updated and deleted by the logged-in user (Ownership)

## Seams
