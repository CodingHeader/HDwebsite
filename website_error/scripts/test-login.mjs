const res = await fetch('http://localhost:6789/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
});
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
if (data.code === 200 && data.data && data.data.token) {
  const fs = await import('node:fs');
  fs.writeFileSync('e:/Code/Demo/HDwebsite/hdwebsite/.token.txt', data.data.token);
  console.log('TOKEN_SAVED');
}
