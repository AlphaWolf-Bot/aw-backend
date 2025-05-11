# Coin Tap Backend

Backend server for the Coin Tap game, handling authentication, coin management, withdrawals, games, tournaments, and settings.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Fill in the environment variables in `.env`:
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Your Supabase service role key
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `JWT_SECRET`: Secret key for JWT token generation

4. Start the development server:
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
- `POST /api/coins/task/:taskId/complete` - Complete a task
- `GET /api/coins/transactions` - Get transaction history

### Withdrawals
- `GET /api/withdrawals` - Get withdrawal history
- `POST /api/withdrawals` - Create withdrawal request

### Games
- `GET /api/games` - Get active games
- `GET /api/games/:id/results` - Get game results
- `POST /api/games` - Create new game (admin only)
- `PATCH /api/games/:id/status` - Update game status (admin only)

### Tournaments
- `GET /api/tournaments` - Get active tournaments
- `GET /api/tournaments/:id` - Get tournament details
- `POST /api/tournaments/:id/join` - Join tournament
- `POST /api/tournaments` - Create tournament (admin only)
- `PATCH /api/tournaments/:id/status` - Update tournament status (admin only)

### Settings
- `GET /api/settings/coins` - Get coin settings
- `GET /api/settings/withdrawals` - Get withdrawal settings
- `PUT /api/settings/coins` - Update coin settings (admin only)
- `PUT /api/settings/withdrawals` - Update withdrawal settings (admin only)

## Database Schema

### Users Table
- `id`: UUID (primary key)
- `telegram_id`: String
- `username`: String
- `coin_balance`: Integer
- `total_earned`: Integer
- `level`: Integer
- `taps_remaining`: Integer
- `last_tap_time`: Timestamp
- `referral_code`: String
- `referred_by`: UUID (foreign key to users)
- `is_admin`: Boolean
- `created_at`: Timestamp

### Transactions Table
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key to users)
- `amount`: Integer
- `type`: String (tap, task, referral, withdrawal)
- `created_at`: Timestamp

### Withdrawals Table
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key to users)
- `amount`: Integer
- `upi_id`: String
- `status`: String (pending, approved, rejected)
- `created_at`: Timestamp

### Games Table
- `id`: UUID (primary key)
- `title`: String
- `description`: String
- `start_time`: Timestamp
- `end_time`: Timestamp
- `status`: String (upcoming, active, completed)
- `created_at`: Timestamp

### Game Results Table
- `id`: UUID (primary key)
- `game_id`: UUID (foreign key to games)
- `user_id`: UUID (foreign key to users)
- `score`: Integer
- `rank`: Integer
- `created_at`: Timestamp

### Tournaments Table
- `id`: UUID (primary key)
- `title`: String
- `description`: String
- `entry_fee`: Integer
- `prize_pool`: Integer
- `start_time`: Timestamp
- `end_time`: Timestamp
- `status`: String (upcoming, active, completed)
- `created_at`: Timestamp

### Tournament Participants Table
- `id`: UUID (primary key)
- `tournament_id`: UUID (foreign key to tournaments)
- `user_id`: UUID (foreign key to users)
- `score`: Integer
- `rank`: Integer
- `created_at`: Timestamp

### Settings Table
- `key`: String (primary key)
- `value`: JSONB
- `updated_at`: Timestamp 