const token = (await import('node:fs')).readFileSync('e:/Code/Demo/HDwebsite/hdwebsite/.token.txt', 'utf8').trim();

// Test media list
const res = await fetch('http://localhost:6789/api/v2/media?page=1&pageSize=5', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await res.json();
console.log('Media List:', JSON.stringify(data, null, 2));
