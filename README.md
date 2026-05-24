# Canteen Automation

This app uses Express and MongoDB through Mongoose.

## Database Setup

1. Install MongoDB locally, or create a MongoDB Atlas database.
2. Copy `.env.example` to `.env`.
3. Update `MONGO_URI` in `.env` if you are using Atlas or a different database name.
4. Install dependencies:

```bash
npm install
```

5. Start the app:

```bash
npm start
```

6. Open `http://localhost:5000`.

You can confirm the database connection at:

```text
http://localhost:5000/api/health
```

The app seeds default records when the database is empty:

- Student login: `123` / `123`
- Admin login: `admin123` / `123`
