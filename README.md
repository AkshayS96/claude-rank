# Unofficial Claude Leaderboard & CLI (crank-cli)

A community-driven leaderboard for tracking Claude Code usage metrics.

## Project Structure

- `app/`: Next.js frontend (Leaderboard UI).
- `app/cli`: The `crank-cli` tool (Node.js).
- `supabase/`: Database schema and migrations.

## Prerequisites

- Node.js 18+
- Supabase Project (or local instance)
- X (Twitter) Developer Account (for Auth)

## Setup

### 1. Database (Supabase)

Run the migration SQL files in your Supabase SQL Editor to set up the schema:
1. `supabase/schema.sql` (Base schema)
2. `supabase/migrations/*` (Apply any subsequent migrations)

### 2. Frontend (Leaderboard)

1. Navigate to the app directory:
   ```bash
   cd app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (for admin API routes)
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

### 3. CLI Development (crank-cli)

To work on the CLI locally:

1. Navigate to the CLI directory:
   ```bash
   cd app/cli
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the CLI:
   ```bash
   npm run build
   ```

4. Link for local testing:
   ```bash
   npm link
   ```
   Now you can run `crank-cli` globally.

## Usage

### User Setup
Users can join the leaderboard by running:
```bash
npx crank-cli login
npx crank-cli setup
```

### Viewing Stats
```bash
npx crank-cli status
```

## Deployment

### Frontend
Deploy the `app/` directory to Vercel.

### CLI
Publish to npm:
```bash
cd app/cli
npm publish
```
