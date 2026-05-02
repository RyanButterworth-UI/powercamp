import bcrypt from 'bcryptjs';

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error('Usage: npm run hash:admin-password <password>');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  console.log('Add this to backend/.env (do NOT include the quotes):');
  console.log('');
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Hash failed:', err);
  process.exit(1);
});
