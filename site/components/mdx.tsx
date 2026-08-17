import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { Evidence } from './evidence';
import { RelatedAdrs } from './related-adrs';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Evidence,
    RelatedAdrs,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
