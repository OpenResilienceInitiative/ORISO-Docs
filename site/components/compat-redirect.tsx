'use client';
import {useEffect} from 'react';
export function CompatRedirect({destination}:{destination:string}) {
 useEffect(()=>{window.location.replace(destination+window.location.search+window.location.hash);},[destination]);
 return <a href={destination}>Zur deutschen Dokumentation / Open German documentation</a>;
}
