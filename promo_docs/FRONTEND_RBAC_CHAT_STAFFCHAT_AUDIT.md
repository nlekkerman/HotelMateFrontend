# Frontend RBAC Audit — `chat` + `staff_chat` modules

Scope: every guest/staff chat surface (module key `chat`) and every internal staff chat surface (module key `staff_chat`) under `hotelmate-frontend/src/`.

Authority contract (only):
- `user.rbac.<module>.visible`
- `user.rbac.<module>.read`
- `user.rbac.<module>.actions.<action>`
- Consumed exclusively through `useCan()` / `can(module, action)` from [hotelmate-frontend/src/rbac/index.js](hotelmate-frontend/src/rbac/index.js)

Forbidden in any chat/staff_chat code path: `role`, `role_slug`, `access_level`, `tier`, `isAdmin`, `isStaffAdmin`, `isSuperStaffAdmin`, `canAccess([...])`, `hasNavAccess(...)` for actions, fallback "or" logic, invented keys, ownership-only short-circuits that bypass RBAC.

UI must fail closed: missing `user`, missing module, missing action key, or unauthenticated guest → `false`.

Action keys covered:
- `message_send`
- `message_moderate`
- `attachment_upload`
- `attachment_delete`
- `conversation_create`
- `conversation_delete`
- `conversation_assign`

> Note on guests: guests authenticate via single-token URL, not `user.rbac`. `useCan('chat', ...)` will return `false` for them by design (fail closed). Public guest surfaces must therefore be gated by guest-token presence (existing token check) for *visibility* and **explicitly bypass `useCan` only for the guest-side `message_send` and `attachment_upload` actions**, as per the "guest token is the credential" contract. Staff-side surfaces of the same `chat` module are RBAC-gated.

---

## 0. Existing primitive (correct)

[hotelmate-frontend/src/rbac/can.js](hotelmate-frontend/src/rbac/can.js) and [hotelmate-frontend/src/rbac/useCan.js](hotelmate-frontend/src/rbac/useCan.js) already implement the required contract. **No new helper is required.** All replacements below use these existing exports.

The legacy hook [hotelmate-frontend/src/hooks/usePermissions.js](hotelmate-frontend/src/hooks/usePermissions.js) reads `user.role_slug` / `user.role` and exposes `canAccess([...roles])`. **It must not be used inside chat/staff_chat surfaces.**

---

## 1. `chat` module — guest/staff guest-chat surfaces

### 1.1 [hotelmate-frontend/src/pages/chat/ChatHomePage.jsx](hotelmate-frontend/src/pages/chat/ChatHomePage.jsx)

| Action | Current gating | Legacy / nav / tier / role logic | Correct RBAC | Minimal change |
|---|---|---|---|---|
| `visible` (page itself) | Route-level only; the page renders unconditionally for the staff route `/${hotelSlug}/chat`. No in-component gate. | None inside file. | `useCan('chat')` `.user?.rbac?.chat?.visible === true` for staff. Route guard should also enforce. | Add at top of component: `const { user } = useAuth(); const visible = user?.rbac?.chat?.visible === true; if (!visible) return null;`. (No new helper.) |

No `message_send` / `attachment_*` / `conversation_*` controls live in this file — it only composes `ChatSidebar` + `ChatWindow`. No legacy role/tier/`canAccess`/`hasNavAccess` references. **No further changes needed here for RBAC.**

---

### 1.2 [hotelmate-frontend/src/pages/GuestChatPortal.jsx](hotelmate-frontend/src/pages/GuestChatPortal.jsx)

Public guest entry. Auth = `hotel_slug + token` query params. No `user.rbac` available.

| Action | Current gating | Legacy logic | Correct RBAC | Minimal change |
|---|---|---|---|---|
| `visible` | Token + slug presence check (already correct for guest contract). | None. | Guest contract is token-based, not RBAC — no change. | None. |

No staff actions occur here. `message_send` / `attachment_upload` flow through `GuestChatWidget` / `ChatWindow` (rows 1.3 / 1.4).

---

### 1.3 [hotelmate-frontend/src/components/guest/GuestChatWidget.jsx](hotelmate-frontend/src/components/guest/GuestChatWidget.jsx)

Pure guest surface. Uses guest token; no `user`, no `rbac`.

| Action | Current gating | Legacy logic | Correct RBAC | Minimal change |
|---|---|---|---|---|
| `message_send` | `MessageInput` send button: `disabled={disabled || isSending || !message.trim()}`; `disabled` = upstream connection/state. **No** RBAC. | None. | Guest-side only — RBAC is staff-only. Per contract, guest sends are token-authorised. **Do not** wire `useCan('chat', 'message_send')` here (would fail closed for guests). | None — leave as-is. Document with a comment `// Guest auth: token-based, not RBAC-gated.` |
| `message_moderate` | Not present. | None. | Not applicable to guest UI. | None. |
| `attachment_upload` | Not implemented in this widget (no file input rendered). | None. | Same as `message_send` — guest-side, token-based. | None. |
| `attachment_delete` | Not present. | None. | Not applicable. | None. |
| `conversation_create` | Implicit via first message on guest token. | None. | Guest contract. | None. |
| `conversation_delete` | Not present. | None. | Not applicable. | None. |
| `conversation_assign` | Not present. | None. | Not applicable. | None. |

---

### 1.4 [hotelmate-frontend/src/components/chat/ChatWindow.jsx](hotelmate-frontend/src/components/chat/ChatWindow.jsx)

Dual-mode component: renders for **staff** (when `userId` is set) and for **guests** (when `isGuest = !userId`). All staff action gates here belong to the `chat` module (guest-to-staff conversation surface).

| # | Surface (line) | Action | Current gating | Legacy/nav/tier/role | Correct RBAC | Minimal change |
|---|---|---|---|---|---|---|
| a | Send button (`#L1922-L1932`) | `message_send` | `disabled={!conversationId || uploading || (!newMessage.trim() && selectedFiles.length === 0)}`. **No RBAC.** Both staff and guest hit `handleSendMessage`. | None. | Staff: `can('chat','message_send')`. Guest: token-based bypass. | At top of component: `const { can } = useCan(); const canSend = isGuest ? true : can('chat','message_send');`. Replace `disabled={...}` with `disabled={... || !canSend}`. Wrap `handleSendMessage` early-return: `if (!canSend) return;`. |
| b | Message text input (`#L1880-L1897`) | `message_send` | Disabled only on `!conversationId || uploading`. | None. | Same as (a). | Add `|| !canSend` to `disabled`. |
| c | Attach-files button (`#L1786-L1793`) | `attachment_upload` | `disabled={!conversationId || uploading}`. **No RBAC.** | None. | Staff: `can('chat','attachment_upload')`. Guest: token-based bypass. | `const canAttach = isGuest ? true : can('chat','attachment_upload');` Add `|| !canAttach` to `disabled`. Also early-return inside `handleFileSelect` and the `filesToSend.length > 0` branch of `handleSendMessage`. |
| d | Hidden `<input type="file">` (`#L1779`) | `attachment_upload` | None — accepts any selection if user manually triggers. | None. | Same as (c). | Same gate; do not render input or short-circuit `onChange` if `!canAttach`. |
| e | Hover "Delete" on attachments (`#L1366-L1378`) | `attachment_delete` | Visible whenever message has attachments. **No ownership check, no RBAC.** | None — but this lets a guest delete a staff message's attachments and vice versa. | Staff: `can('chat','attachment_delete')`. Guest: not applicable (do not show). | Wrap button: `{!isGuest && can('chat','attachment_delete') && msg.attachments?.length > 0 && (...)}`. |
| f | Footer "Delete" on own message (`#L1586-L1607`) | `message_moderate` (hard delete on others) / soft self-delete is a `message_send`-grade right per contract → use `message_moderate` for any UI that deletes a message produced by this surface | Visible if `isMine`. **No RBAC** — own-message delete is allowed unconditionally; cannot delete others. | Ownership-only short-circuit; bypasses RBAC for own message. | Per contract every action must come from RBAC. Use `can('chat','message_moderate')`. (If product wants self-delete distinct, backend must expose a separate action; until then, fail closed via `message_moderate`.) | Replace `{isMine && (...)}` with `{!isGuest && can('chat','message_moderate') && (...)}`. Also early-return `handleDeleteMessage` if `!can('chat','message_moderate')`. |
| g | `handleMessageDeletion(...)` call inside `handleDeleteMessage` (`#L1018-L1037`) | `message_moderate` | None. | None. | `can('chat','message_moderate')`. | Guard at top of `handleDeleteMessage`. |
| h | Auto `assign-staff` POST inside `assignStaffToConversation` effect (`#L1170-L1198`) | `conversation_assign` | Fires on every staff open of a guest conversation. **No RBAC.** | Implicit "if staff" only (`if (!userId || isGuest || !hotelSlug) return;`). | `can('chat','conversation_assign')`. | Inside the effect: `const { user } = useAuth(); if (!can(user,'chat','conversation_assign')) return;` (use module-level `can` or read from `useCan()` hook in component body and check before calling). |
| i | `mark-read` POST in same effect / on input click (`#L1198`, `#L1808-L1873`) | `read` (not in audit list, but same family) | No RBAC. | None. | Optional gate `user.rbac.chat.read === true`. | Out-of-scope for this audit's seven actions; flagged for completeness. |
| j | `conversation_create` | Not surfaced in `ChatWindow`. Guest conversations are created server-side from the booking token; staff cannot create from this surface. | None. | N/A here. | None. |
| k | `conversation_delete` | Not surfaced. | None. | N/A here. | None. |

`isMine` (`#L1209`) is computed from `userId` / `sender_type` and is a UI ownership signal only — **keep it for layout (left/right alignment)**, not for action gating.

---

### 1.5 [hotelmate-frontend/src/components/chat/ChatSidebar.jsx](hotelmate-frontend/src/components/chat/ChatSidebar.jsx)

Renders the room/conversation list passed via props.

| Action | Current gating | Legacy logic | Correct RBAC | Minimal change |
|---|---|---|---|---|
| `visible` (sidebar) | Always renders if conversations exist. | None. | `user.rbac.chat.visible === true` for staff. | The parent (`ChatHomePage`) should already have failed closed; no in-component change needed if (1.1) is fixed. Alternative: at top, `const { user } = useAuth(); if (!user?.rbac?.chat?.visible) return null;`. |
| `conversation_delete` | Not present. | None. | If a future "delete conversation" affordance is added, gate `can('chat','conversation_delete')`. | None today. |
| `conversation_create` | Not present (guest creates implicitly). | None. | N/A. | None. |

No `canAccess`, `isAdmin`, `role*`, or `hasNavAccess` references in this file.

---

### 1.6 [hotelmate-frontend/src/components/chat/utils/messageDelete.jsx](hotelmate-frontend/src/components/chat/utils/messageDelete.jsx)

Pure utility — issues `DELETE /api/staff/hotel/{slug}/chat/messages/{id}/delete/`. No UI. **No gating belongs here**; gating is the caller's responsibility (1.4 (f)/(g) above). Comment `(managers only)` on `hardDelete` parameter is documentation only and does not gate anything.

| Action | Current gating | Correct RBAC | Minimal change |
|---|---|---|---|
| `message_moderate` | None (caller-controlled). | Caller must enforce. | None in this file; remove the misleading `(managers only)` jsdoc and replace with `// Caller MUST gate via useCan('chat','message_moderate')`. |

Other utils (`messageDownload.jsx`, `messageShare.jsx`, `messageReply.jsx`) have no destructive actions in scope.

---

### 1.7 Other `chat`-module call sites

`grep` for `useCan|canAccess|isAdmin|isStaffAdmin|hasNavAccess|role_slug|access_level|usePermissions` inside `hotelmate-frontend/src/components/chat/**` and `hotelmate-frontend/src/pages/chat/**`: **zero matches**. There is no legacy role/tier logic to remove in the `chat` directory tree — the work is purely *adding* the missing `useCan` gates listed in 1.4.

---

## 2. `staff_chat` module — internal staff chat surfaces

### 2.1 [hotelmate-frontend/src/staff_chat/components/ConversationView.jsx](hotelmate-frontend/src/staff_chat/components/ConversationView.jsx)

The single biggest concentration of legacy logic.

Current legacy block (line 16, 147-148):

```js
import { usePermissions } from '@/hooks/usePermissions';
...
const { canAccess } = usePermissions();
const isManagerOrAdmin = canAccess(['manager', 'admin', 'super_staff_admin', 'staff_admin']);
```

This violates every hard rule (`role_slug`/`role` reads, `canAccess([...])`, role-string list).

| # | Surface (line) | Action | Current gating | Legacy logic | Correct RBAC | Minimal change |
|---|---|---|---|---|---|---|
| a | `MessageBubble onDelete` prop (`#L515`) | `message_moderate` (others) + own-message moderation | `onDelete={isOwn || isManagerOrAdmin ? () => handleDelete(message.id, false) : null}` | `isManagerOrAdmin` from `canAccess([...roles])`. **Forbidden.** Also, `isOwn` short-circuits RBAC. | `can('staff_chat','message_moderate')`. | Replace with `onDelete={can('staff_chat','message_moderate') ? () => handleDelete(message.id, false) : null}`. |
| b | `MessageActions` props (`#L530-L540`) | `message_moderate` (`canHardDelete`) and own-delete (`canDelete`) | `canDelete={isOwn} canHardDelete={isManagerOrAdmin}` | Same `isManagerOrAdmin` legacy. | Both → `can('staff_chat','message_moderate')`. (Backend exposes only one action key in scope.) | `canDelete={can('staff_chat','message_moderate')} canHardDelete={can('staff_chat','message_moderate')}`. |
| c | `handleDelete` (`#L357-L383`) | `message_moderate` | No internal gate. | None. | Guard at top: `if (!can('staff_chat','message_moderate')) return;`. | Add the guard line. |
| d | `handleDeleteAttachment` (`#L387-L398`) | `attachment_delete` | No gate; any user who hits the hover button can fire. | None. | `can('staff_chat','attachment_delete')`. | Guard at top: `if (!can('staff_chat','attachment_delete')) return;`. |
| e | `handleSendMessage` text branch (`#L295-L325`) | `message_send` | No gate. | None. | `can('staff_chat','message_send')`. | Guard at top of `handleSendMessage`. Also disable `MessageInput` `disabled` prop based on `!can('staff_chat','message_send')`. |
| f | `handleSendMessage` upload branch / `uploadFiles` | `attachment_upload` | No gate. | None. | `can('staff_chat','attachment_upload')`. | Inside `handleSendMessage`, when `selectedFiles.length > 0`: `if (!can('staff_chat','attachment_upload')) { setSending(false); return; }`. Also gate `MessageInput onFileSelect` / file picker visibility. |
| g | `ParticipantsModal` open + `canManageParticipants={true}` (`#L606`) | `conversation_assign` (add/remove participants is the closest semantic match for "assign") | Hard-coded `true`. | None. | `can('staff_chat','conversation_assign')`. | `canManageParticipants={can('staff_chat','conversation_assign')}`. Also gate the "open participants" button (`#L290-L294`) visibility on the same check (read-only view is fine without it; hide *manage* affordance). |
| h | Remove `usePermissions` legacy (`#L16, L147-L148`) | n/a | n/a | The two-line block above. | n/a | Delete the import and both `const` lines. Replace with `const { can } = useCan();` (`import { useCan } from '@/rbac';`). |

There is no `conversation_create` or `conversation_delete` UI surfaced inside `ConversationView`.

---

### 2.2 [hotelmate-frontend/src/staff_chat/components/ChatWindowPopup.jsx](hotelmate-frontend/src/staff_chat/components/ChatWindowPopup.jsx)

Mirror of `ConversationView` for the floating popup.

| # | Surface (line) | Action | Current gating | Legacy logic | Correct RBAC | Minimal change |
|---|---|---|---|---|---|---|
| a | `MessageActions` `canDelete={isOwn}` / `canHardDelete={false}` (`#L706-L709`) | `message_moderate` | Hard-coded `false` for hard delete; `isOwn` for soft. **No RBAC.** Comment says `// Set based on user permissions`. | None (no role check), but ownership-only. | `can('staff_chat','message_moderate')`. | `canDelete={can('staff_chat','message_moderate')} canHardDelete={can('staff_chat','message_moderate')}`. Remove the TODO comment. |
| b | `useDeleteMessage` callback (`#L172-L180`) | `message_moderate` | No gate. | None. | Same. | Inside the `(messageId, hardDelete, result) => {...}` and in `handleSendMessage`/delete invocation site, add `if (!can('staff_chat','message_moderate')) return;` *before* calling `deleteMsg`. |
| c | `handleSendMessage` (`#L349-L357`) → text path | `message_send` | No gate. | None. | `can('staff_chat','message_send')`. | Guard at top. |
| d | `handleUploadFiles` (`#L389-L420+`) | `attachment_upload` | No gate. | None. | `can('staff_chat','attachment_upload')`. | Guard at top. |
| e | `ParticipantsModal canManageParticipants={true}` (`#L877`) | `conversation_assign` | Hard-coded `true`. | None. | `can('staff_chat','conversation_assign')`. | Replace with `can('staff_chat','conversation_assign')`. |
| f | Attachment delete buttons (via `MessageAttachments`) | `attachment_delete` | Inherits `canDelete` prop from caller; currently not RBAC-gated. | None. | `can('staff_chat','attachment_delete')`. | Pass `canDelete={can('staff_chat','attachment_delete')}` everywhere this file renders `MessageAttachments`. |

No legacy `usePermissions` / `canAccess` / `isAdmin*` references in this file (verified by grep). Work is purely *adding* the seven gates.

---

### 2.3 [hotelmate-frontend/src/staff_chat/components/MessageActions.jsx](hotelmate-frontend/src/staff_chat/components/MessageActions.jsx)

Pure presentational dropdown driven by props (`canEdit`, `canDelete`, `canHardDelete`, `isOwn`, `onShare`, `onReply`).

| Action | Current gating | Legacy | Correct RBAC | Minimal change |
|---|---|---|---|---|
| `message_moderate` | Renders Soft Delete if `isOwn && canDelete && onDelete`. Hard Delete if `canHardDelete && onHardDelete`. | None. | Caller must compute via `can('staff_chat','message_moderate')`. | **No change inside this file.** It is correctly prop-driven. Fix the callers (2.1 a/b, 2.2 a). |
| Other actions | Reply / Share rendered if their handler is supplied. | None. | Reply / Share are not in the audit's 7-action list. | None. |

---

### 2.4 [hotelmate-frontend/src/staff_chat/components/MessageInput.jsx](hotelmate-frontend/src/staff_chat/components/MessageInput.jsx)

Pure presentational input, prop-driven (`disabled`, `onSend`, `onFileSelect`, `selectedFiles`).

| Action | Current gating | Legacy | Correct RBAC | Minimal change |
|---|---|---|---|---|
| `message_send` | `disabled` prop. | None. | Caller composes from `can('staff_chat','message_send')`. | No change in this file. Caller must pass `disabled={... || !can('staff_chat','message_send')}`. |
| `attachment_upload` | File button visible when `onFileSelect` is supplied. | None. | Caller must omit `onFileSelect` (or render no-op) when `!can('staff_chat','attachment_upload')`. | Caller-side change. |

---

### 2.5 [hotelmate-frontend/src/staff_chat/components/MessageAttachments.jsx](hotelmate-frontend/src/staff_chat/components/MessageAttachments.jsx)

Renders attachment list with optional delete X (`canDelete && onDelete`).

| Action | Current gating | Legacy | Correct RBAC | Minimal change |
|---|---|---|---|---|
| `attachment_delete` | `canDelete` prop. | None. | Caller passes `canDelete={can('staff_chat','attachment_delete')}`. | No change inside this file. Fix every render site (`ConversationView`, `ChatWindowPopup`, `MessageBubble`). |

---

### 2.6 [hotelmate-frontend/src/staff_chat/components/MessageBubble.jsx](hotelmate-frontend/src/staff_chat/components/MessageBubble.jsx)

Receives `onDelete` (rendered as inline trash button), `attachments`. No internal RBAC. Fully prop-driven.

| Action | Current gating | Legacy | Correct RBAC | Minimal change |
|---|---|---|---|---|
| `message_moderate` (delete) | `onDelete` prop. | None. | Caller passes `onDelete = can('staff_chat','message_moderate') ? handler : null`. | Caller-side; see 2.1 (a). |
| `attachment_delete` (forwarded `onDeleteAttachment`) | Prop. | None. | Caller-driven. | No change here. |

---

### 2.7 [hotelmate-frontend/src/staff_chat/components/FileUpload.jsx](hotelmate-frontend/src/staff_chat/components/FileUpload.jsx)

Pure drag-and-drop UI; no RBAC. Caller controls whether it is rendered.

| Action | Current gating | Correct RBAC | Minimal change |
|---|---|---|---|
| `attachment_upload` | None. | Render only when `can('staff_chat','attachment_upload')`. | No file change; gate at every mount site. |

---

### 2.8 [hotelmate-frontend/src/staff_chat/components/ConversationsList.jsx](hotelmate-frontend/src/staff_chat/components/ConversationsList.jsx)

Search box + list of existing conversations + "Mark all as read" + "Start new chat with searched staff" entry.

| # | Surface | Action | Current gating | Legacy | Correct RBAC | Minimal change |
|---|---|---|---|---|---|---|
| a | `handleStartNewChat` (`#L99-L170`) → `startConversation([staff.id])` | `conversation_create` | No gate. Anyone who reaches this UI can create. | None. | `can('staff_chat','conversation_create')`. | At top of `handleStartNewChat`: `if (!can('staff_chat','conversation_create')) return;`. Hide the staff result row's "start" affordance via the same check. |
| b | `handleMarkAllAsRead` / `bulkMarkAsRead` | `read` (out-of-scope action) | No gate. | None. | `user.rbac.staff_chat.read === true`. | Out-of-scope; flag for follow-up. |
| c | Visibility of the whole list | `visible` | Renders unconditionally. | None. | `user.rbac.staff_chat.visible === true`. | Top of component: `const { user } = useAuth(); if (!user?.rbac?.staff_chat?.visible) return null;`. |
| d | Conversation row click → opens chat | `read` | None. | None. | `user.rbac.staff_chat.read === true`. | Out-of-scope. |
| e | Conversation row delete | `conversation_delete` | **Not surfaced** anywhere in current UI. | None. | If/when added, gate `can('staff_chat','conversation_delete')`. | None today. |

No `usePermissions`/`canAccess`/`isAdmin` in this file.

---

### 2.9 [hotelmate-frontend/src/staff_chat/components/StaffChatList.jsx](hotelmate-frontend/src/staff_chat/components/StaffChatList.jsx)

Same shape as `ConversationsList` but for the "Start a Conversation" full-screen view.

| Surface | Action | Current gating | Legacy | Correct RBAC | Minimal change |
|---|---|---|---|---|---|
| `handleStartChat` (`#L33-L45`) → `startConversation([staffId])` | `conversation_create` | No gate. | None. | `can('staff_chat','conversation_create')`. | `if (!can('staff_chat','conversation_create')) return;` at top, and gate the per-row "Start chat" button rendering on the same value. |
| Component visible | `visible` | Renders unconditionally. | None. | `user.rbac.staff_chat.visible === true`. | `if (!user?.rbac?.staff_chat?.visible) return null;` at top. |

---

### 2.10 [hotelmate-frontend/src/staff_chat/components/StaffChatContainer.jsx](hotelmate-frontend/src/staff_chat/components/StaffChatContainer.jsx)

Pure router between list/conversation views. No actions; no gates; no legacy.

| Action | Change |
|---|---|
| `visible` | Add an early-return on `!user?.rbac?.staff_chat?.visible` to fail closed at the container. |
| All others | Inherit from children (2.1, 2.8, 2.9). No change here. |

---

### 2.11 [hotelmate-frontend/src/staff_chat/components/MessengerWidget.jsx](hotelmate-frontend/src/staff_chat/components/MessengerWidget.jsx)

Messenger-style floating widget. Hosts `ConversationsList`, `ChatWindowPopup` instances, and `GroupChatModal`.

| # | Surface | Action | Current gating | Legacy | Correct RBAC | Minimal change |
|---|---|---|---|---|---|---|
| a | Widget root render (`#L300+`) / floating launcher | `visible` | Renders for any authenticated `isStaff` user. | `isStaff` from `useAuth`. **`isStaff` is a tier flag** — check `AuthContext` definition; if it derives from `role`/`tier`, it violates hard rules when used to gate this surface. Either way, RBAC is the contract. | `user.rbac.staff_chat.visible === true`. | Top of component: `if (!user?.rbac?.staff_chat?.visible) return null;`. Remove the `isStaff` gate (or keep purely as a "is logged-in staff session" precondition, never as the authority). |
| b | "Create Group" button → `handleOpenGroupModal` (`#L282-L284`) | `conversation_create` | Always rendered. | None. | `can('staff_chat','conversation_create')`. | Render button only when `can('staff_chat','conversation_create')`. Also guard `handleOpenGroupModal` body. |
| c | `<GroupChatModal />` (`#L445`) | `conversation_create` | Always mountable when `showGroupModal`. | None. | Same. | Guard the `setShowGroupModal(true)` call (already covered by (b)). |

---

### 2.12 [hotelmate-frontend/src/staff_chat/components/GroupChatModal.jsx](hotelmate-frontend/src/staff_chat/components/GroupChatModal.jsx)

Form for creating a group chat. Calls `useGroupChat().createGroup()`.

| Surface | Action | Current gating | Legacy | Correct RBAC | Minimal change |
|---|---|---|---|---|---|
| `handleCreateGroup` (`#L36-L48`) | `conversation_create` | No gate. | None. | `can('staff_chat','conversation_create')`. | `if (!can('staff_chat','conversation_create')) return;` at top of `handleCreateGroup`. Disable submit button via the same flag. |
| Modal `show` | `visible` of modal | Driven by parent. | None. | Parent already gates per (2.11 b). | None here. |

---

### 2.13 [hotelmate-frontend/src/staff_chat/components/StaffChatFloatingButton.jsx](hotelmate-frontend/src/staff_chat/components/StaffChatFloatingButton.jsx)

Floating launcher to navigate to `/staff-chat`.

| Surface | Action | Current gating | Legacy | Correct RBAC | Minimal change |
|---|---|---|---|---|---|
| Render of `<button>` | `visible` | `if (!hotelSlug) return null;` only. | None. | `user.rbac.staff_chat.visible === true`. | `if (!hotelSlug || !user?.rbac?.staff_chat?.visible) return null;`. |

---

### 2.14 [hotelmate-frontend/src/staff_chat/components/ParticipantsModal.jsx](hotelmate-frontend/src/staff_chat/components/ParticipantsModal.jsx)

Renders participants and allows removal. Drives `removeParticipant` and `leaveConversation` from `staffChatApi`.

| # | Surface | Action | Current gating | Legacy | Correct RBAC | Minimal change |
|---|---|---|---|---|---|---|
| a | `<ParticipantsList canRemove={canManageParticipants} ... />` (`#L128`) | `conversation_assign` | Driven by prop. Callers currently hard-code `true` (see 2.1 g, 2.2 e). | None inside this file. | Caller passes `can('staff_chat','conversation_assign')`. | No change here. Fix callers. |
| b | `handleRemoveParticipant` (`#L28-L57`) | `conversation_assign` | No internal gate. | None. | Caller-controlled, but defence-in-depth: gate at top. | Add `if (!canManageParticipants) return;` at top of `handleRemoveParticipant` (it currently only relies on the X button being hidden). |
| c | `handleLeaveGroup` | self-leave (not in audit's 7) | No gate. | None. | Out-of-scope. | None. |

---

### 2.15 [hotelmate-frontend/src/staff_chat/components/StaffSelector.jsx](hotelmate-frontend/src/staff_chat/components/StaffSelector.jsx) / `StaffListItem.jsx` / `SearchInput.jsx` / `OnDutyBadge.jsx` / `StaffAvatar.jsx` / `ReadStatus.jsx` / `ReactionsList.jsx` / `ReactionPicker.jsx` / `SuccessModal.jsx` / `ConfirmDeleteModal.jsx` / `ShareMessageModal.jsx` / `FCMTestPanel.jsx`

Pure presentational, push-notification, or reaction surfaces. None of the seven audited actions live here. No legacy role/tier/`canAccess` references (verified by grep across the directory). **No changes required.**

`ShareMessageModal.jsx.backup` exists in the tree and contains a stale `createConversation(...)` call — it is a `.backup` file and not imported anywhere. **Recommend deletion** to avoid confusion, but no RBAC change is required since it's not loaded.

---

### 2.16 [hotelmate-frontend/src/staff_chat/hooks/](hotelmate-frontend/src/staff_chat/hooks)

`useDeleteMessage.js`, `useSendMessage.js`, `useFileUpload.js`, `useGroupChat.js`, `useStartConversation.js`, `useConversations.js`, etc. — all are thin API wrappers, none read `user.rbac`, none read `role`/`role_slug`/`access_level`/`tier`/`isAdmin`. **Gating is the caller's responsibility** (already covered above). The `(managers only)` JSDoc comments on `useDeleteMessage.js` (`#L18`) and `staffChatApi.js` `deleteMessage` (`#L185`) are non-functional and should be reworded to `// Caller MUST gate via useCan('staff_chat','message_moderate')`.

---

## 3. Summary of legacy / forbidden code to remove

Single occurrence in this audit's scope:

- [hotelmate-frontend/src/staff_chat/components/ConversationView.jsx](hotelmate-frontend/src/staff_chat/components/ConversationView.jsx#L16)  
  `import { usePermissions } from '@/hooks/usePermissions';`  
- [hotelmate-frontend/src/staff_chat/components/ConversationView.jsx](hotelmate-frontend/src/staff_chat/components/ConversationView.jsx#L147-L148)  
  `const { canAccess } = usePermissions();`  
  `const isManagerOrAdmin = canAccess(['manager', 'admin', 'super_staff_admin', 'staff_admin']);`

Plus every consumer of `isManagerOrAdmin` in the same file (lines 515, 530-540).

No other `chat`/`staff_chat` source file in the audited scope contains `usePermissions`, `canAccess`, `isAdmin`, `isStaffAdmin`, `isSuperStaffAdmin`, `role_slug`, `access_level`, or `hasNavAccess` references.

Soft legacy (ownership-only short-circuits that bypass RBAC and need to be re-routed through `useCan`):

- `ChatWindow.jsx` footer "Delete" → `{isMine && (...)}` → must become `can('chat','message_moderate')`.
- `ConversationView.jsx` `MessageBubble onDelete` → `{isOwn || isManagerOrAdmin ? ... : null}` → must become `can('staff_chat','message_moderate')`.
- `ChatWindowPopup.jsx` `MessageActions canDelete={isOwn}` → must become `can('staff_chat','message_moderate')`.

Hard-coded `true` values to replace:

- `ConversationView.jsx#L606` and `ChatWindowPopup.jsx#L877`: `canManageParticipants={true}` → `can('staff_chat','conversation_assign')`.
- `ChatWindowPopup.jsx#L709`: `canHardDelete={false}` (with TODO comment) → `can('staff_chat','message_moderate')`.

---

## 4. Action-by-action coverage matrix

Legend: ✅ already gated correctly · ➕ gate to be added · 🛠 legacy to replace · ➖ not applicable here

### `chat` module

| Surface | message_send | message_moderate | attachment_upload | attachment_delete | conversation_create | conversation_delete | conversation_assign |
|---|---|---|---|---|---|---|---|
| `pages/chat/ChatHomePage.jsx` | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| `pages/GuestChatPortal.jsx` | ➖ (guest token) | ➖ | ➖ (guest token) | ➖ | ➖ (server-side) | ➖ | ➖ |
| `components/guest/GuestChatWidget.jsx` | ➖ (guest token) | ➖ | ➖ (guest token) | ➖ | ➖ | ➖ | ➖ |
| `components/chat/ChatWindow.jsx` (staff mode) | ➕ | 🛠 (replace `isMine`-only delete) | ➕ | ➕ (replace ungated hover delete) | ➖ | ➖ | ➕ (auto `assign-staff` POST) |
| `components/chat/ChatSidebar.jsx` | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ (none today) | ➖ |
| `components/chat/utils/messageDelete.jsx` | ➖ | caller-gated | ➖ | ➖ | ➖ | ➖ | ➖ |

### `staff_chat` module

| Surface | message_send | message_moderate | attachment_upload | attachment_delete | conversation_create | conversation_delete | conversation_assign |
|---|---|---|---|---|---|---|---|
| `staff_chat/components/ConversationView.jsx` | ➕ | 🛠 (replace `isManagerOrAdmin`/`isOwn`) | ➕ | ➕ | ➖ | ➖ | 🛠 (replace `canManageParticipants={true}`) |
| `staff_chat/components/ChatWindowPopup.jsx` | ➕ | 🛠 (replace `canDelete={isOwn}`, `canHardDelete={false}`) | ➕ | ➕ | ➖ | ➖ | 🛠 (replace `canManageParticipants={true}`) |
| `staff_chat/components/MessageActions.jsx` | ➖ | caller-gated (no change) | ➖ | ➖ | ➖ | ➖ | ➖ |
| `staff_chat/components/MessageInput.jsx` | caller-gated | ➖ | caller-gated | ➖ | ➖ | ➖ | ➖ |
| `staff_chat/components/MessageAttachments.jsx` | ➖ | ➖ | ➖ | caller-gated | ➖ | ➖ | ➖ |
| `staff_chat/components/MessageBubble.jsx` | ➖ | caller-gated | ➖ | caller-gated | ➖ | ➖ | ➖ |
| `staff_chat/components/FileUpload.jsx` | ➖ | ➖ | caller-gated | ➖ | ➖ | ➖ | ➖ |
| `staff_chat/components/ConversationsList.jsx` | ➖ | ➖ | ➖ | ➖ | ➕ (`handleStartNewChat`) | ➖ (none today) | ➖ |
| `staff_chat/components/StaffChatList.jsx` | ➖ | ➖ | ➖ | ➖ | ➕ (`handleStartChat`) | ➖ | ➖ |
| `staff_chat/components/StaffChatContainer.jsx` | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| `staff_chat/components/MessengerWidget.jsx` | ➖ | ➖ | ➖ | ➖ | ➕ (Create Group button) | ➖ | ➖ |
| `staff_chat/components/GroupChatModal.jsx` | ➖ | ➖ | ➖ | ➖ | ➕ (`handleCreateGroup`) | ➖ | ➖ |
| `staff_chat/components/StaffChatFloatingButton.jsx` | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| `staff_chat/components/ParticipantsModal.jsx` | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | caller-gated + add internal `if (!canManageParticipants) return;` defence-in-depth |
| `staff_chat/hooks/*` | n/a (caller) | n/a (caller) | n/a (caller) | n/a (caller) | n/a (caller) | n/a (caller) | n/a (caller) |

---

## 5. Visibility (`user.rbac.<module>.visible`) summary

These surfaces should also fail closed on `visible`:

- [hotelmate-frontend/src/pages/chat/ChatHomePage.jsx](hotelmate-frontend/src/pages/chat/ChatHomePage.jsx) → `chat.visible`
- [hotelmate-frontend/src/components/chat/ChatSidebar.jsx](hotelmate-frontend/src/components/chat/ChatSidebar.jsx) → `chat.visible`
- [hotelmate-frontend/src/staff_chat/components/StaffChatContainer.jsx](hotelmate-frontend/src/staff_chat/components/StaffChatContainer.jsx) → `staff_chat.visible`
- [hotelmate-frontend/src/staff_chat/components/StaffChatList.jsx](hotelmate-frontend/src/staff_chat/components/StaffChatList.jsx) → `staff_chat.visible`
- [hotelmate-frontend/src/staff_chat/components/ConversationsList.jsx](hotelmate-frontend/src/staff_chat/components/ConversationsList.jsx) → `staff_chat.visible`
- [hotelmate-frontend/src/staff_chat/components/MessengerWidget.jsx](hotelmate-frontend/src/staff_chat/components/MessengerWidget.jsx) → `staff_chat.visible` (replace the `isStaff` reliance)
- [hotelmate-frontend/src/staff_chat/components/StaffChatFloatingButton.jsx](hotelmate-frontend/src/staff_chat/components/StaffChatFloatingButton.jsx) → `staff_chat.visible`

Guest entry points (`pages/GuestChatPortal.jsx`, `components/guest/GuestChatWidget.jsx`) remain token-gated, **not** RBAC-gated.

---

## 6. Files with no required changes

(Verified clean of all forbidden patterns and not in any audited action surface.)

- `staff_chat/components/{StaffSelector,StaffListItem,SearchInput,OnDutyBadge,StaffAvatar,ReadStatus,ReactionsList,ReactionPicker,SuccessModal,ConfirmDeleteModal,ShareMessageModal,FCMTestPanel}.jsx`
- `components/chat/utils/{messageReply,messageShare,messageDownload,replyUtils,index}.jsx|js`
- `staff_chat/hooks/*.js`
- `staff_chat/services/staffChatApi.js`
- `staff_chat/context/StaffChatContext.jsx`

(Documentation-only file: `staff_chat/docs/*.md` — no code.)

---

## 7. Acceptance checklist for the upcoming refactor

- [ ] No file under `hotelmate-frontend/src/{components/chat,pages/chat,staff_chat}/**` imports `usePermissions` from `@/hooks/usePermissions`.
- [ ] No file under that scope references `role`, `role_slug`, `access_level`, `tier`, `isAdmin`, `isStaffAdmin`, `isSuperStaffAdmin`, `canAccess`, or `hasNavAccess` for action gating.
- [ ] Every action surface listed in §1.4 and §2.1–§2.14 is wrapped with `useCan()` / `can(module, action)` from `@/rbac`.
- [ ] No fallback "or" between RBAC and ownership, or between RBAC and tier (hard rule).
- [ ] All hard-coded `canManageParticipants={true}` and `canHardDelete={false}` literals are replaced with `can('staff_chat','conversation_assign')` / `can('staff_chat','message_moderate')` respectively.
- [ ] Failing closed verified for: unauthenticated user, user with empty `rbac`, user with `rbac.<module>` missing, user with `actions` map missing, user with action key absent or set to anything other than `true`.
- [ ] Guest-token surfaces (`GuestChatWidget`, `GuestChatPortal`) explicitly opt-out of `useCan` for `chat.message_send` / `chat.attachment_upload` and document the token-only contract in a comment.
