export type TaxonomicScopeType = 'plant' | 'genus' | 'family' | 'all';
export type TaxonomicSourceScopeType = 'plant' | 'genus' | 'family';

export type TaxonomicSourceScopePrimitives = {
  readonly scope: TaxonomicSourceScopeType;
  readonly value?: string | undefined;
};

export type TaxonomicScopePrimitives = {
  readonly scope: TaxonomicScopeType;
  readonly value?: string | undefined;
};
