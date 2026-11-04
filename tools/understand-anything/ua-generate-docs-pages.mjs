#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareDocumentation } from '../truth-chain/lib/pipeline.mjs';
const here=dirname(fileURLToPath(import.meta.url));
function arg(name,fallback){const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];}
try {
 const generation=arg('--generation');
 if(!generation)throw Error('--generation is required; an unvalidated export.json is not publication evidence');
 if(process.argv.includes('--dry-run'))throw Error('Use a temporary --repo fixture for review; pipeline cannot register unwritten pages');
 const result=prepareDocumentation({generationDir:generation,repoRoot:resolve(arg('--repo',resolve(here,'../..'))),toolingRoot:arg('--tooling',here),evidenceMap:arg('--map'),reposRoot:arg('--repos-root')});
 console.log(`OK docs-pages generation=${result.registry.generationId} registered=${result.registry.pages.length} written=${result.written}`);
}catch(error){console.error(error.message);process.exitCode=1;}
