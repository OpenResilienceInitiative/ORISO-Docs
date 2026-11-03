"""Read back every approved viewer's generation and source; no token/body output."""
import argparse,os,pathlib,json,hashlib,urllib.request,urllib.parse,gzip

def request_json(origin,file,token,params=None):
    query={'token':token,**(params or {})};url=origin.rstrip('/')+'/'+file+'?'+urllib.parse.urlencode(query)
    try:
        with urllib.request.urlopen(url,timeout=30) as response:return json.load(response)
    except Exception:raise ValueError('Viewer request failed; inspect route/runtime binding privately')

def request_graph_bytes(origin,token):
    url=origin.rstrip('/')+'/knowledge-graph.json?'+urllib.parse.urlencode({'token':token})
    try:
        with urllib.request.urlopen(urllib.request.Request(url,headers={'Accept-Encoding':'gzip'}),timeout=60) as response:return {'contentEncoding':response.headers.get('Content-Encoding'),'body':response.read()}
    except Exception:raise ValueError('Public compressed graph request failed; inspect route binding privately')

def verify_compressed_graph(origin,expected,token,fetch_bytes=request_graph_bytes):
    response=fetch_bytes(origin,token)
    if response.get('contentEncoding')!='gzip':raise ValueError('Public graph did not negotiate gzip transport')
    try:decoded=gzip.decompress(response['body'])
    except Exception:raise ValueError('Public gzip graph decoding failed')
    if hashlib.sha256(decoded).digest()!=hashlib.sha256(expected).digest():raise ValueError('Public decoded graph byte hash mismatch')
    return True

def readback_viewer(root,binding,token,fetch_json=request_json):
    root=pathlib.Path(root);origin=binding['origin'];parsed=urllib.parse.urlparse(origin)
    if not token:raise ValueError('Missing existing viewer readback token binding: '+binding['service'])
    if parsed.scheme!='https' or parsed.hostname!='understand.oriso.org' or parsed.username or parsed.query:raise ValueError('Explicit canonical viewer origin required')
    generation=root/'graph-generation';manifest=json.loads((generation/'manifest.json').read_text());graph_root=generation/binding['repository']
    expected_meta=json.loads((graph_root/'.understand-anything/meta.json').read_text());graph=json.loads((graph_root/'.understand-anything/knowledge-graph.json').read_text())
    if expected_meta.get('generationId')!=manifest['generationId']:raise ValueError('Retained viewer generation binding mismatch')
    source=next((s for s in manifest['sources'] if s['repository']==binding['repository']),None)
    if source and expected_meta.get('gitCommitHash')!=source['sourceSHA']:raise ValueError('Retained viewer full source SHA mismatch')
    public_meta=fetch_json(origin,'meta.json',token)
    if public_meta!=expected_meta:raise ValueError('Public viewer metadata/generation/source SHA mismatch: '+binding['service'])
    # Static production serving preserves the sealed JSON bytes; no normalization.
    if fetch_json(origin,'knowledge-graph.json',token)!=graph:raise ValueError('Public viewer graph/generation mismatch: '+binding['service'])
    vector={s['repository']:s['sourceSHA'] for s in manifest['sources']}
    if binding['repository'] in {'ORISO-Platform','ORISO-Supergraph'} and graph.get('project',{}).get('sourceCommits')!=vector:raise ValueError('Aggregate viewer source vector mismatch')
    for node in graph['nodes']:
        repo=node.get('sourceRepo') or node.get('metadata',{}).get('sourceRepo') or binding['repository'];relative=node.get('filePath')
        if repo in {'ORISO-Supergraph','ORISO-Platform'} or not relative or pathlib.Path(relative).is_absolute() or '..' in pathlib.Path(relative).parts:continue
        candidate=root/repo/relative
        if not candidate.is_file() or candidate.is_symlink() or not candidate.resolve().is_relative_to((root/repo).resolve()):continue
        expected=candidate.read_bytes()
        if len(expected)>1048576 or b'\0' in expected:continue
        try:expected.decode('utf8')
        except UnicodeDecodeError:continue
        data=fetch_json(origin,'file-content.json',token,{'path':relative,'nodeId':node['id']})
        if binding['repository'] in {'ORISO-Platform','ORISO-Supergraph'} and (data.get('sourceRepo')!=repo or data.get('sourceCommit')!=vector.get(repo)):raise ValueError('Actual viewer source identity mismatch: '+binding['service'])
        if hashlib.sha256(data.get('content','').encode()).digest()!=hashlib.sha256(expected).digest():raise ValueError('Actual viewer source byte hash mismatch: '+binding['service'])
        return binding['service']
    raise ValueError('No eligible public text source node for viewer: '+binding['service'])
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--source-root',required=True);p.add_argument('--bindings',required=True);a=p.parse_args()
    try:
        try:tokens=json.loads(os.environ.get('UNDERSTAND_VIEWER_READBACK_TOKENS','{}'))
        except Exception:raise ValueError('Invalid existing viewer-token mapping binding')
        for binding in json.loads(pathlib.Path(a.bindings).read_text()):
            root=pathlib.Path(a.source_root)/'current'
            service=readback_viewer(root,binding,tokens.get(binding['service']))
            verify_compressed_graph(binding['origin'],(root/'graph-generation'/binding['repository']/'.understand-anything/knowledge-graph.json').read_bytes(),tokens.get(binding['service']))
            print('Actual public viewer generation, source SHA and source byte hash and decoded gzip graph bytes verified: '+service)
    except Exception as e:raise SystemExit(str(e))
