# iConnect Sequence Cup — Next.js + MongoDB

Tournament manager for the iConnect Sequence Cup: teams, round-robin fixtures, standings, and knockout bracket. Data is stored in MongoDB Atlas instead of browser localStorage.

## Setup

1. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and set `MONGODB_URI` with your real database password (replace `YOUR_PASSWORD`). If the password contains special characters, [URL-encode](https://www.mongodb.com/docs/atlas/troubleshoot-connection/#special-characters-in-connection-string-password) them.

   Example base URL:

   `mongodb+srv://ajunu534_db_user:<password>@cluster0.tvbeced.mongodb.net/?retryWrites=true&w=majority`

3. In MongoDB Atlas, allow your IP under **Network Access** and ensure the database user has read/write access.

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## API routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tournament` | Load full tournament state |
| PUT | `/api/tournament` | Import backup JSON |
| DELETE | `/api/tournament` | Reset tournament |
| POST | `/api/teams` | Add team |
| DELETE | `/api/teams/[id]` | Remove team |
| POST | `/api/teams/sample` | Load sample teams |
| POST | `/api/fixtures` | Shuffle & create fixtures |
| PATCH | `/api/matches/[id]` | Save or edit match result |
| POST | `/api/matches/clear` | Clear all group results |
| PATCH | `/api/knockout` | Save semi/final scores |

## Production

```bash
npm run build
npm start
```

Set `MONGODB_URI` in your hosting provider’s environment variables (Vercel, etc.).
