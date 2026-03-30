async function run() {
  const r = await fetch('https://api.anushatechnologies.com/api/delivery/auth/check-phone/%2B919948598351');
  console.log('HTTP:', r.status);
}
run();
