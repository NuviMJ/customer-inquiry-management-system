import { readFile } from 'node:fs/promises'
import { pool } from '../src/db.js'
import { seed } from './seed.js'

// Usage: npm run db:setup  (drops and recreates all tables, then seeds)
async function main() {
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8')
  await pool.query(schema)
  const counts = await seed(pool)
  console.log(`Database ready: ${counts.users} users, ${counts.inquiries} inquiries`)
}

main()
  .catch((err) => {
    console.error('Database setup failed:', err.message)
    process.exitCode = 1
  })
  .finally(() => pool.end())
