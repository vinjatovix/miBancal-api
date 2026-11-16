export type IdentityPrimitives = {
  name: {
    primary: string;
    aliases?: string[];
  };
  family: string;
  scientificName: string;
  /**
   * Derived by PlantIdentity from `scientificName`. Persisted (and indexed) so
   * `filter[genus]` can match; always re-derived on read and never accepted
   * from client input.
   */
  genus?: string;
};
