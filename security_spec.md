# Security Spec: User Profiles

## 1. Data Invariants
- A user profile must have a valid `uid` matching the authenticated user.
- A user can only access their own profile (`/userProfiles/{userId}` where `userId == request.auth.uid`).
- `createdAt` is immutable.
- `updatedAt` must be set to `request.time`.

## 2. The "Dirty Dozen" Payloads (Deny cases)
1. **Identity Spoofing**: Creating a profile with a different `uid` than `request.auth.uid`.
2. **Access Breach**: Reading another user's profile.
3. **Malicious Write**: Updating another user's profile.
4. **Shadow Field**: Adding `isVerified: true` to a profile creation.
5. **ID Poisoning**: Using a 1MB string as a document ID.
6. **Type Poisoning**: Sending an integer for the `name` field.
7. **Boundary Breach**: Sending an empty name string.
8. **PII Leak**: Querying for all user emails (if we had them).
9. **Timestamp Spoofing**: Setting `updatedAt` to a future date manually.
10. **Immutability Bypass**: Trying to change `createdAt`.
11. **State Injection**: Injecting extra keys not in the schema.
12. **Anonymous Write**: Trying to create a profile without being logged in.

## 3. Test Runner
(Placeholder for actual test file if needed, but for now we focus on the rules logic).
