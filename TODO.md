# Realtime Admin Updates TODO

- [x] Inspect auth utilities and route write points for integration accuracy
- [x] Add Socket.IO server setup in `server.js` with JWT/admin auth
- [x] Create `utils/realtime.js` helper for admin event emission
- [x] Integrate realtime emission in:
  - [x] `routes/forms.js`
  - [x] `routes/bookings.js`
  - [x] `routes/donations.js`
  - [x] `routes/feedback.js`
  - [x] `routes/admin.js`
- [x] Keep existing REST endpoints unchanged for fallback polling
- [ ] Run critical-path tests (health, auth, create/update flows)
- [ ] Summarize findings and remaining thorough test coverage
