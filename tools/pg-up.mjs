// Throwaway Postgres for the G4/G7/G8 tests. Needs the Docker daemon running.
import { execSync } from 'node:child_process';
const NAME = 'swafto-pg-test', PORT = 55432;
try { execSync('docker version', { stdio: 'ignore' }); }
catch { console.error('Docker daemon not reachable. Start Docker Desktop and retry.'); process.exit(1); }
try { execSync(`docker rm -f ${NAME}`, { stdio: 'ignore' }); } catch {}
execSync(`docker run -d --name ${NAME} -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=swafto_test -p ${PORT}:5432 postgres:17-alpine`, { stdio: 'inherit' });
process.stdout.write('waiting for postgres');
for (let i = 0; i < 60; i++) {
  try { execSync(`docker exec ${NAME} pg_isready -U postgres -d swafto_test`, { stdio: 'ignore' }); 
        console.log(`\nready → DATABASE_URL=postgres://postgres:postgres@localhost:${PORT}/swafto_test`); process.exit(0); }
  catch { process.stdout.write('.'); execSync('node -e "setTimeout(()=>{},1000)"'); }
}
console.error('\ntimed out'); process.exit(1);
