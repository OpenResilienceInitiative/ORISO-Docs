#!/usr/bin/env node
import {prepareDocumentation} from './lib/pipeline.mjs';
function arg(name,otherwise){const i=process.argv.indexOf(name);if(i<0){if(otherwise!==undefined)return otherwise;throw Error(`Required ${name}`);}return process.argv[i+1];}
function optional(name){const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1];}
try {
 const result=prepareDocumentation({generationDir:arg('--generation'),repoRoot:arg('--repo',process.cwd()),toolingRoot:optional('--tooling'),evidenceMap:optional('--map'),reposRoot:optional('--repos-root')});
 console.log(`Validated graph ${result.registry.generationId}: ${result.registry.pages.length} registered pages, ${result.written} generated locale/source files; evidence checked ${result.evidence.counts.total}`);
}catch(error){console.error(error.message);process.exitCode=1;}
