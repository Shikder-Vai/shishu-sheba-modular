# shishu-sheba-modular

## Forgot / Reset Password

- POST `/v1/forgot-password` with `{ email }` — If the email exists, the server generates a reset token and logs a reset link to the server console. Set `CLIENT_URL` env var to configure the link host (e.g. `http://localhost:5173`).
- POST `/v1/reset-password` with `{ token, password }` — Validates token and updates password.

Note: In production, integrate an email provider (e.g. SendGrid, SES) to actually send reset links instead of logging them.
