# Ember & Oak Restaurant - Demo

A portfolio demo of a restaurant website with scroll-driven dish journey,
ordering system, and optional demo backend with login/order history.

## ⚠️ Demo Only

This is a **portfolio demo**, not a production application. The authentication
and order storage are simplified for demonstration purposes. Do not use this
as a real e-commerce or authentication system.

## Running the Static Site

Simply open `index.html` in a browser. The site works fully offline (cart,
ordering, journey animation) without any server.

## Running the Demo Server (optional)

The demo server adds login/register and order history features.

### Prerequisites

- Node.js 18+ installed

### Setup

```bash
cd server
npm install
npm start
```

The server starts on `http://localhost:3000` and serves the static site plus
the API. Open `http://localhost:3000` in your browser.

### Without the Server

If the server is not running, the site still works. The "Login" button in the
navbar will show "Demo server offline" and cart/ordering function normally
(orders are stored locally only).

## Project Structure

```
/
├── index.html        # Main page
├── style.css         # All styles
├── script.js         # All front-end logic
├── dishes.js         # Dish data (do not modify)
├── images/dishes/    # Dish cut-out PNGs
├── assets/           # Source images
├── server/
│   ├── index.js      # Express + SQLite server
│   ├── package.json  # Server dependencies
│   └── ember.db      # SQLite database (created on first run)
└── README.md
```

## API Endpoints (demo)

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/register | Create account (name, email, password) |
| POST | /api/login | Login (email, password) |
| POST | /api/logout | Logout |
| GET | /api/me | Current user info |
| POST | /api/orders | Save order (requires login) |
| GET | /api/orders | List user's orders |

## Tech Stack

- **Frontend:** Plain HTML, CSS, JavaScript
- **Backend (demo):** Node.js, Express, better-sqlite3, bcryptjs, express-session
- **Database:** SQLite (better-sqlite3)