"""Read back every approved viewer's generation and source; no token/body output."""
import argparse,os,pathlib,json,hashlib,urllib.request,urllib.parse,copy

def request_json(origin,file,token,params=None):
    query={'token':token,**(params or {})};url=origin.rstrip('/')+'/'+file+'?'+urllib.parse.urlencode(query)
    try:
        with urllib.request.urlopen(url,timeout=30) as response:return json.load(response)
    except Exception:raise ValueError('Viewer request failed; inspect route/runtime binding privately')

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
    # Match the pinned server's privacy-preserving path normalization.
    expected_graph=copy.deepcopy(graph)
    for node in expected_graph.get('nodes',[]):
        relative=node.get('filePath')
        if isinstance(relative,str) and pathlib.Path(relative).is_absolute():
            node['filePath']=str(pathlib.Path(relative).relative_to(graph_root)) if pathlib.Path(relative).is_relative_to(graph_root) else pathlib.Path(relative).name
    if fetch_json(origin,'knowledge-graph.json',token)!=expected_graph:raise ValueError('Public viewer graph/generation mismatch: '+binding['service'])
    for node in graph['nodes']:
        repo=node.get('metadata',{}).get('sourceRepo') or binding['repository'];relative=node.get('filePath')
        if repo in {'ORISO-Supergraph','ORISO-Platform'} or not relative or pathlib.Path(relative).is_absolute() or '..' in pathlib.Path(relative).parts:continue
        candidate=root/repo/relative
        if not candidate.is_file() or candidate.is_symlink() or not candidate.resolve().is_relative_to((root/repo).resolve()):continue
        expected=candidate.read_bytes()
        if len(expected)>1048576 or b'\0' in expected:continue
        try:expected.decode('utf8')
        except UnicodeDecodeError:continue
        data=fetch_json(origin,'file-content.json',token,{'path':relative,'nodeId':node['id']})
        if hashlib.sha256(data.get('content','').encode()).digest()!=hashlib.sha256(expected).digest():raise ValueError('Actual viewer source byte hash mismatch: '+binding['service'])
        return binding['service']
    raise ValueError('No eligible public text source node for viewer: '+binding['service'])
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--source-root',required=True);p.add_argument('--bindings',required=True);a=p.parse_args()
    try:
        try:tokens=json.loads(os.environ.get('UNDERSTAND_VIEWER_READBACK_TOKENS','{}'))
        except Exception:raise ValueError('Invalid existing viewer-token mapping binding')
        for binding in json.loads(pathlib.Path(a.bindings).read_text()):
            service=readback_viewer(pathlib.Path(a.source_root)/'current',binding,tokens.get(binding['service']))
            print('Actual public viewer generation, source SHA and source byte hash verified: '+service)
    except Exception as e:raise SystemExit(str(e))
