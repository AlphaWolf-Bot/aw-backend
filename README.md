# Alpha Wulf Backend

Backend API for the Alpha Wulf Telegram Mini App, built with Express.js and Supabase.

## Features

- Telegram Web App authentication
- Tap-to-earn coin system
- Social task completion rewards
- Referral system
- Withdrawal management
- Admin panel
- Game and tournament system

## Tech Stack

- Node.js + Express.js
- Supabase (PostgreSQL)
- JWT Authentication
- Telegram Bot API

## Prerequisites

- Node.js 16+
- Supabase account
- Telegram Bot Token

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your configuration:
   ```bash
   cp .env.example .env
   ```
4. Set up Supabase:
   - Create a new project
   - Run the SQL migrations from `supabase/migrations`
   - Enable Row Level Security (RLS)
   - Set up the required functions and triggers

5. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with Telegram
- `GET /api/auth/me` - Get current user data

### Coins
- `GET /api/coins/balance` - Get user's coin balance
- `POST /api/coins/tap` - Earn coins by tapping
- `POST /api/coins/task/:taskId/complete` - Complete a social task
- `GET /api/coins/transactions` - Get transaction history

### Withdrawals
- `GET /api/withdrawals` - Get withdrawal history
- `POST /api/withdrawals` - Create withdrawal request

### Admin
- `GET /api/admin/users` - Get all users
- `GET /api/admin/withdrawals` - Get all withdrawals
- `POST /api/admin/withdrawals/:id/approve` - Approve withdrawal
- `POST /api/admin/withdrawals/:id/reject` - Reject withdrawal

## Database Schema

The database uses the following tables:
- users
- transactions
- tasks
- user_completed_tasks
- withdrawals
- games
- game_results
- tournaments
- tournament_participants
- settings

## Security

- JWT-based authentication
- Rate limiting on high-traffic routes
- Input validation and sanitization
- Row Level Security (RLS) in Supabase
- Telegram Web App data validation

## Deployment

The backend is configured for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License. 