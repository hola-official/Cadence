/**
 * Marks all non-Arc policies as inactive in the database.
 * This stops the relayer from processing them and removes them from the UI.
 * Run: npx tsx scripts/deactivate-old-policies.ts
 */
import 'dotenv/config'
import postgres from 'postgres'

const ARC_CHAIN_ID = 5042002
const db = postgres(process.env.DATABASE_URL!)

// Show what we're about to deactivate
const toDeactivate = await db`
  SELECT id, payer, merchant, chain_id, charge_amount, charge_count, created_at
  FROM policies
  WHERE active = true AND chain_id != ${ARC_CHAIN_ID}
`

if (toDeactivate.length === 0) {
  console.log('✅ No active non-Arc policies found.')
  await db.end()
  process.exit(0)
}

console.log(`\nFound ${toDeactivate.length} active non-Arc policy(ies) to deactivate:\n`)
for (const p of toDeactivate) {
  console.log(`  Policy: ${p.id}`)
  console.log(`  Chain:  ${p.chain_id}`)
  console.log(`  Payer:  ${p.payer}`)
  console.log(`  Charges: ${p.charge_count}`)
  console.log()
}

// Deactivate them
const result = await db`
  UPDATE policies
  SET active = false
  WHERE active = true AND chain_id != ${ARC_CHAIN_ID}
  RETURNING id, chain_id
`

console.log(`✅ Deactivated ${result.length} policy(ies):`)
for (const r of result) {
  console.log(`  ${r.id} (chain ${r.chain_id})`)
}

// Also cancel any pending charges for those policies
const cancelledCharges = await db`
  UPDATE charges
  SET status = 'cancelled'
  WHERE policy_id = ANY(${result.map(r => r.id)})
    AND status = 'pending'
  RETURNING id
`
if (cancelledCharges.length > 0) {
  console.log(`\n✅ Cancelled ${cancelledCharges.length} pending charge(s)`)
}

await db.end()
console.log('\nDone. Refresh the frontend to see changes.')
