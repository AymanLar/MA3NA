/**
 * Entity types present in MA3NA.
 *
 * Commodity and country nodes were removed when the data layer was rebuilt:
 * no official source used by this project publishes commodity exposure or
 * country linkage for Moroccan listed issuers, so those nodes would have had to
 * be invented. Official index nodes replace them, because the exchange does
 * publish index values.
 */
export type NodeType = 'company' | 'sector' | 'index' | 'event';

export const NODE_TYPES: NodeType[] = ['company', 'sector', 'index', 'event'];

export const NODE_TYPE_LABEL: Record<NodeType, string> = {
  company: 'Company',
  sector: 'Sector',
  index: 'Index',
  event: 'Event',
};

/** Tailwind colour token per node type. */
export const NODE_TYPE_TOKEN: Record<NodeType, string> = {
  company: 'tCompany',
  sector: 'tSector',
  index: 'tCommodity',
  event: 'tEvent',
};

export interface GraphEntity {
  id: string;
  type: NodeType;
  label: string;
  sublabel: string;
  x: number;
  y: number;
  meta: Record<string, unknown>;
}
