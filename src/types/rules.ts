import { ACTS, FETCH_TYPES } from "./common";

export interface RuleField {
  field: string;
  externalField: string;
}

export interface RuleAction {
  act: ACTS;
  fields?: RuleField[];
  url?: string;
  pipeline? : RuleAction[];
}

export interface Rule {
  origin: string;
  url: string;
  fetchType: FETCH_TYPES;
  results: string;
  nextPage?: string;
  pipeline: RuleAction[];
}

export interface Rules {
  list: Rule[];
}
