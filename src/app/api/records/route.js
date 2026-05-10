import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// GET: Mengambil semua data dari database
export async function GET() {
    try {
        const { rows } = await sql`SELECT * FROM records ORDER BY created_at ASC;`;
        return NextResponse.json(rows);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Menyimpan data baru ke database
export async function POST(request) {
    try {
        const { game, name, time_ms, formatted_time, is_valid, reason } = await request.json();

        const result = await sql`
      INSERT INTO records (game, name, time_ms, formatted_time, is_valid, reason)
      VALUES (${game}, ${name}, ${time_ms}, ${formatted_time}, ${is_valid}, ${reason})
      RETURNING *;
    `;

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
