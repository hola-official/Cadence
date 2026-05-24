import 'dotenv/config'
import postgres from 'postgres'

const db = postgres(process.env.DATABASE_URL!)

const rows = await db`
  SELECT id, payer, merchant, chain_id, charge_amount, active, created_at, total_spent, charge_count
  FROM policies
  ORDER BY created_at DESC
  LIMIT 50
`

console.log('\nAll policies:')
console.table(rows.map(r => ({
  id: r.id.slice(0, 10) + '...',
  chain: r.chain_id,
  active: r.active,
  payer: r.payer?.slice(0, 10) + '...',
  charges: r.charge_count,
  created: new Date(r.created_at).toLocaleDateString(),
})))

const fuji = rows.filter(r => r.chain_id == 43113)
const arc  = rows.filter(r => r.chain_id == 5042002)
console.log(`\nFuji (43113): ${fuji.length} total, ${fuji.filter(r=>r.active).length} active`)
console.log(`Arc (5042002): ${arc.length} total, ${arc.filter(r=>r.active).length} active`)

await db.end()
