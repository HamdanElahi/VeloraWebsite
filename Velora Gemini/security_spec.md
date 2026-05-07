# Security Specification - Velora

## Data Invariants
1. A reservation must have a valid name, phone, date, and time.
2. The date must be in the future (though Firestore rules are limited in complex date logic, we can check basic formats and strings).
3. Guests and Seating must belong to the defined enums.
4. Contact messages must have a non-empty name, valid email, and message.
5. Users can only create reservations/contacts (public access for creation).
6. Admins can read and delete reservations/contacts.

## The "Dirty Dozen" Payloads (Examples)
1. **Empty Name**: `{ "phone": "123", "date": "2026-10-10", ... }` - Should be denied (missing required field).
2. **Invalid Enum (Guests)**: `{ "name": "Test", "guests": "Party of 20", ... }` - Should be denied.
3. **Invalid ID Poisoning**: Trying to write to `reservations/!@#$%^&*` - `isValidId()` should catch this.
4. **Spoofing CreatedAt**: Setting `created_at` to a past date manually instead of `serverTimestamp()`.
5. **Unauthorized Read**: An unauthenticated user tries to list all reservations.
6. **Shadow Update**: Adding `isVip: true` to a reservation payload.
7. **Invalid Type**: Sending a boolean for `name`.
8. **Resource Exhaustion**: Sending a 1MB string for `special_request`.
9. **State Shortcut**: Setting status to `confirmed` directly during creation (if we want initial to be `pending`).
10. **Bypassing Verification**: Setting `email_verified` manually if we had user profiles.
11. **Orphaned Writes**: (Not applicable yet without relations).
12. **Double Booking Injection**: (Handled by client but rules should gate specific status changes).

## The Test Runner (Mock)
(I will skip the full `.test.ts` file for now to focus on the rules implementation, but following phase 1-4).
