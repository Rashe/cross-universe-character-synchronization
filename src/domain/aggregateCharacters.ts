import { Character } from '../types/character';
import fs from 'fs/promises';
import path from 'path';
import { ACTS, FETCH_TYPES } from "../types/common";
import pLimit from 'p-limit';
import { Rules } from "../types/rules";
import axios from "axios";
import { getNestedValue } from "../utils/utils";


const CONCURRENCY_LIMIT = 50; // let's not kill our network please
const DB_PATH = path.join(__dirname, '../db/fakeDb.json');

export async function aggregateCharacters() {
  try {
    const result: Character[] = [];
    // can be from DB
    const rules: Rules = JSON.parse(await fs.readFile(path.join(__dirname, '../db/rules.json'), 'utf-8'));

    for (const rule of rules.list) {
      const res = await handleRule(rule);
      if (res?.length) {
        result.push(...res);
      }
    }

    const collator = new Intl.Collator('en', {sensitivity: 'base', numeric: true});
    result.sort((a, b) => collator.compare(a.name, b.name));

    await saveCharactersToFile(result);

    return result;
  } catch (e) {
    console.error(e);
  }
}

async function handleRule(rule: any): Promise<Character[] | undefined> {
  try {
    console.log("start handling rule for", rule.origin);
    if (rule.fetchType === FETCH_TYPES.ALL) {
      return await handleRuleFetchTypeAll(rule)
    }

    if (rule.fetchType === FETCH_TYPES.PAGINATED) {
      return await handleRuleFetchTypePaginated(rule)
    }
  } catch (e) {
    console.error(e);
  }
}

async function handleRuleFetchTypePaginated(rule: any): Promise<Character[] | undefined> {
  try {
    const limit = pLimit(CONCURRENCY_LIMIT);

    const response: Character[] = [];
    let nextUrl: string | null = rule.url;


    while (nextUrl) {
      const pageResults = await axios.get<any>(nextUrl);
      if (pageResults?.data[rule.results]?.length) {
        const results = pageResults.data[rule.results];
        nextUrl = getNestedValue(pageResults.data, rule.nextPage);

        await Promise.all(results.map((item: any) => limit(async () => {
          const character: Character = {name: "", origin: rule.origin, additional_attribute: "", species: ""};

          await handlePipeline(item, rule.pipeline, character);
          normalizeSpecies(character);

          response.push(character);
        })));
      } else {
        nextUrl = null;
      }
    }
    return response;
  } catch (e) {
    console.error(e);
  }
}

async function handleRuleFetchTypeAll(rule: any): Promise<Character[] | undefined> {
  try {

    const response: Character[] = [];
    const limit = pLimit(CONCURRENCY_LIMIT);

    const allResults = await axios.get<any>(rule.url);
    if (allResults?.data[rule.results]?.length) {
      const results = allResults.data[rule.results];

      await Promise.all(results.map((item: any) => limit(async () => {
        const character: Character = {name: "", origin: rule.origin, additional_attribute: "", species: []};

        await handlePipeline(item, rule.pipeline, character);
        normalizeSpecies(character);

        response.push(character);
      })));
    }
    return response;
  } catch (e) {
    console.error(e);
  }
}

function normalizeSpecies(character: Character) {
  if (Array.isArray(character.species)) {
    character.species = character.species?.join("/");
  }
}

async function handlePipeline(data: any, pipeline: any[], character: Character): Promise<any> {
  for (const action of pipeline) {
    if (action.act === ACTS.GET_VALUE) {
      const vals = actGetValues(data, action.fields);
      Object.assign(character, vals);
    }

    if (action.act === ACTS.FETCH) {
      let urls: string[] = getNestedValue(data, action.url) || [];
      if (!Array.isArray(urls)) {
        urls = [urls];
      }

      const limit = pLimit(CONCURRENCY_LIMIT);
      await Promise.all(urls.map((url) => limit(async () => {
        try {
          const fetchedData = await axios.get<any>(url);
          if (fetchedData?.data) {
            await handlePipeline(fetchedData.data, action.pipeline, character);
          }
        } catch (e) {
          console.error(`Failed to fetch URL: ${ url }`, e);
        }
      })));
    }
  }
}

function actGetValues(data: any, fields: { field: string; externalField: string }[]) {
  const result: Record<string, unknown> = {};

  for (const {field, externalField} of fields) {
    const value = getNestedValue(data, externalField);
    if (value === undefined) continue;

    const current = result[field];

    if (current === undefined) {
      result[field] = value;
    } else if (Array.isArray(current)) {
      result[field] = [...current, value];
    } else {
      result[field] = [current, value];
    }
  }

  return result;
}


export async function getStoredCharacters(): Promise<Character[]> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveCharactersToFile(data: Character[]) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(e);
  }
}

