// Rebuild a complete export; retired routes must never survive a previous build.
import {rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
await import('./sync-content.mjs');
rmSync(fileURLToPath(new URL('../out/',import.meta.url)),{recursive:true,force:true});
const next=createRequire(import.meta.url).resolve('next/dist/bin/next');
process.exitCode=spawnSync(process.execPath,[next,'build'],{stdio:'inherit',env:process.env}).status??1;
