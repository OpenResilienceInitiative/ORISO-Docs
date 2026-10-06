import {validateGlossary} from '../glossary/validate.mjs';
import {assessSourceBinding} from '../glossary/source-bindings.mjs';

/** Editorial vocabulary changes supported consumer names/tags, never technical IDs or behavioral claims. */
export function projectGlossary(data, input, selected) {
  validateGlossary(data);
  const {repository,revision}=selected;
  if(input.project?.name!==repository || input.project?.gitCommitHash!==revision) throw Error('Glossary graph selected source revision mismatch: '+repository);
  const graph=structuredClone(input), outcomes=[], groups=new Map();
  for(const concept of data.concepts) for(const mapping of concept.graphMappings.filter(m=>m.repository===repository)) {
    const matches=graph.nodes.filter(n=>n.id===mapping.nodeId);
    const outcome={conceptId:concept.id,...mapping,selectedRevision:revision,reviewedRevision:data.audit.sourceVector[repository]??null};
    if(matches.length!==1 || matches[0].type!==(mapping.mode==='domain-concept'?'concept':'file')) {
      outcomes.push({...outcome,state:'unavailable',reason:'Mapped node is missing, ambiguous, or has the wrong type.'});continue;
    }
    let state=outcome.reviewedRevision===revision?'verified':'historical',reason='Vocabulary projection is editorial; original behavioral evidence is unchanged.';
    if(mapping.mode==='source-file') {
      const sourcePath=mapping.nodeId.slice('file:'.length);
      const source=[...concept.codeMappings,...concept.sources].find(s=>s.repository===repository&&s.path===sourcePath);
      if(source) {
        const binding=assessSourceBinding(source,selected);
        outcome.reviewedRevision=source.sourceRevision;
        state=binding.state;
        if(source.binding==='historical-review' && source.sourceRevision!==revision && state==='verified')state='historical';
        reason=binding.reason;
      } else {state='unavailable';reason='No reviewed source-file binding is available.';}
    }
    outcomes.push({...outcome,state,reason});
    const group=groups.get(mapping.nodeId)??{node:matches[0],concepts:[],labels:[]};
    group.concepts.push(concept);
    if(mapping.mode==='domain-concept') {
      if(!mapping.label?.de?.trim() || !mapping.label?.en?.trim())throw Error('Glossary bilingual curated label required: '+mapping.nodeId);
      group.labels.push(mapping.label.en+' / '+mapping.label.de);
    }
    groups.set(mapping.nodeId,group);
  }
  for(const [id,{node,concepts,labels}] of groups) {
    if(new Set(labels).size>1)throw Error('Glossary conflicting curated labels: '+id);
    const originalName=node.metadata?.glossary?.originalName??node.name;
    if(labels.length)node.name=labels[0];
    node.tags=[...new Set([...node.tags,...(labels.length?[originalName]:[]),...concepts.flatMap(c=>[c.de.term,c.en.term,...c.aliases.de,...c.aliases.en,...c.deprecatedTerms.map(t=>t.term)])])];
    node.metadata={...node.metadata,glossary:{schemaVersion:1,originalName,conceptIds:[...new Set(concepts.map(c=>c.id))].sort(),reviewedAt:data.reviewedAt,evidence:'editorial-vocabulary-not-runtime-verification',mappings:outcomes.filter(o=>o.nodeId===id)}};
  }
  return {graph,outcomes};
}

/** Current authority claims fail closed; review revision is retained independently of selected bytes. */
export function validateGlossarySources(data, selectedSources) {
  validateGlossary(data);
  return data.concepts.flatMap(concept=>concept.sources.map((source,sourceIndex)=>{
    const binding=assessSourceBinding(source,selectedSources.find(s=>s.repository===source.repository));
    if(!['verified','external'].includes(binding.state))throw Error('Stale glossary source binding: '+concept.id+' / '+source.title+' ('+binding.state+')');
    return {conceptId:concept.id,sourceIndex,repository:source.repository,path:source.path??null,...binding};
  }));
}
