# Security Specification — BizAssist AI Support Platform

## 1. Data Invariants
1. A `UserProfile` document at `/users/{userId}` can only be read or created by `userId == request.auth.uid` (with `email_verified == true`), and users cannot self-assign `role: "admin"` or `"staff"` unless they are an authenticated admin.
2. A `Ticket` document at `/tickets/{ticketId}` must belong to `workspaceOwnerId == request.auth.uid`, enforce valid severity/status enums, bounded string lengths, and server-side `createdAt == request.time` / `updatedAt == request.time`.
3. Once a ticket reaches terminal status `Resolved & Closed`, non-admin client updates are locked against arbitrary mutation except reopening or admin override.
4. A `TicketMessage` at `/tickets/{ticketId}/messages/{messageId}` requires the parent `/tickets/{ticketId}` document to exist and belong to `request.auth.uid` (Master Gate).
5. `Specialist` and `Notification` records are strictly isolated to `workspaceOwnerId == request.auth.uid`.
6. Every `allow list` rule evaluates `resource.data` directly without `get()` or `exists()` lookups.

## 2. The "Dirty Dozen" Payloads (Adversarial Rejection Matrix)
1. **Unauthenticated Ticket Read**: `GET /tickets/t1` with `auth == null` -> `PERMISSION_DENIED`.
2. **Self-Assigned Admin Role**: `CREATE /users/u1` with `role: "admin"` as non-admin -> `PERMISSION_DENIED`.
3. **Privilege Escalation Update**: `UPDATE /users/u1` modifying `role` -> `PERMISSION_DENIED`.
4. **Shadow Ghost Field on Ticket**: `CREATE /tickets/t1` including `isPriorityBypass: true` -> `PERMISSION_DENIED`.
5. **Cross-Tenant Ticket Hijack**: `CREATE /tickets/t1` with `workspaceOwnerId: "other_uid"` -> `PERMISSION_DENIED`.
6. **Oversized ID Poisoning**: `CREATE /tickets/${'a'.repeat(200)}` -> `PERMISSION_DENIED`.
7. **Client Timestamp Forgery**: `CREATE /tickets/t1` with `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time` -> `PERMISSION_DENIED`.
8. **Immutable Field Tampering**: `UPDATE /tickets/t1` changing `ticketNumber` or `createdAt` -> `PERMISSION_DENIED`.
9. **Orphaned Subcollection Message**: `CREATE /tickets/nonexistent/messages/m1` -> `PERMISSION_DENIED`.
10. **PII Cross-User Read**: `GET /users/victim_uid` as `attacker_uid` -> `PERMISSION_DENIED`.
11. **Unverified Email Write**: `CREATE /tickets/t1` with `auth.token.email_verified == false` -> `PERMISSION_DENIED`.
12. **Type Poisoning on Update**: `UPDATE /tickets/t1` setting `slaMinutesRemaining: "infinite"` -> `PERMISSION_DENIED`.
