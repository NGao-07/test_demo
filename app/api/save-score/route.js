// my-app/app/api/save-score/route.ts
import { Pool } from 'pg';
import { NextResponse } from 'next/server';

// Initialize a connection pool.
// It's better to initialize the pool outside the handler function
// so it can be reused across multiple requests.
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false, // Necessary for some cloud providers like Neon
  },
});

export async function POST(request, Request) {
  try {
    const { playerName, score } = await request.json();

    if (!playerName || typeof score !== 'number') {
      return NextResponse.json({ error: 'Player name and score are required.' }, { status: 400 });
    }

    if (playerName.trim().length === 0) {
        return NextResponse.json({ error: 'Player name cannot be empty.' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const queryText = 'INSERT INTO public.player_score (player_name, score) VALUES ($1, $2) RETURNING *';
      const res = await client.query(queryText, [playerName, score]);
      return NextResponse.json({ message: 'Score saved successfully!', data: res.rows[0] }, { status: 201 });
    } finally {
      client.release(); // Release the client back to the pool
    }
  } catch (error) {
    console.error('Error saving score:', error);
    // Check if error is an instance of Error to access message property safely
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Failed to save score.', details: errorMessage }, { status: 500 });
  }
}

// Optional: Handle GET requests if you want to fetch scores later
// export async function GET() {
//   try {
//     const client = await pool.connect();
//     try {
//       const res = await client.query('SELECT player_name, score FROM public.player_score ORDER BY score DESC LIMIT 10');
//       return NextResponse.json(res.rows, { status: 200 });
//     } finally {
//       client.release();
//     }
//   } catch (error) {
//     console.error('Error fetching scores:', error);
//     const errorMessage = error instanceof Error ? error.message : 'Internal server error';
//     return NextResponse.json({ error: 'Failed to fetch scores.', details: errorMessage }, { status: 500 });
//   }
// }