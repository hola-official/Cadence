import { registerEntitySecretCiphertext } from '@circle-fin/developer-controlled-wallets'
import { randomBytes } from 'crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

const apiKey = process.env.CIRCLE_API_KEY
if (!apiKey) {
  console.error('Error: CIRCLE_API_KEY must be set in .env')
  process.exit(1)
}

console.log('\n── Generating entity secret ──')
const entitySecret = randomBytes(32).toString('hex')
console.log(`  Entity Secret: ${entitySecret}`)

console.log('\n── Registering with Circle ──')
mkdirSync('./recovery', { recursive: true })
const response = await registerEntitySecretCiphertext({
  apiKey,
  entitySecret,
  recoveryFileDownloadPath: './recovery',
})
console.log('  Registered ✓')
if (response.data?.recoveryFile) {
  console.log('  Recovery file saved to: ./recovery/')
}

// Update .env with the generated secret
const envPath = './.env'
let envContent = ''
try { envContent = readFileSync(envPath, 'utf-8') } catch { /* new file */ }

if (envContent.includes('CIRCLE_ENTITY_SECRET=')) {
  envContent = envContent.replace(/CIRCLE_ENTITY_SECRET=.*/, `CIRCLE_ENTITY_SECRET=${entitySecret}`)
} else {
  envContent += `\nCIRCLE_ENTITY_SECRET=${entitySecret}\n`
}
writeFileSync(envPath, envContent)

console.log('\n── Done ──')
console.log('  .env updated with CIRCLE_ENTITY_SECRET')
console.log('  You can now run: npm run start')
