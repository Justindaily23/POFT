async function main() {
  console.log('Starting full seed sequence...\n');

  await import('./seeds/seed-po-types');
  await import('./seeds/states.seed');
  await import('./seeds/login-credentials.seed');

  console.log('\n✅ All seeds completed');
}

main().catch((err) => {
  console.error('Seed sequence failed:', err);
  process.exit(1);
});
