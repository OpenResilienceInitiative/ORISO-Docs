import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const tooling=fileURLToPath(new URL('../../understand-anything/',import.meta.url));
export const releaseFixture=revision=>({schemaVersion:'oriso.platform-release/v1',version:'v2.0.9',releaseUrl:'https://github.com/OpenResilienceInitiative/ORISO-Helm/releases/tag/v2.0.9',documentationRevision:revision,sources:JSON.parse(execFileSync('python3',['-c',"import json,sys;sys.path.insert(0,sys.argv[1]);from bundle.release_inputs import required_repositories;print(json.dumps(sorted(required_repositories())))",tooling],{env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},encoding:'utf8'})).map(repository=>({repository,ref:'refs/tags/v2.0.9',sourceSHA:revision}))});
