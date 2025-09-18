import { Router, Request, Response } from 'express';
import { getStoredCharacters, aggregateCharacters } from '../domain/aggregateCharacters';
import { Character } from "../types/character";

const router = Router();

router.get('/ping', (req: Request, res: Response) => {
  res.json({message: 'pong'});
});

router.get('/characters', async (req: Request, res: Response) => {
  try {
    let characters: Character[] | undefined = await getStoredCharacters();
    if (!characters || characters.length === 0) {
      characters = await aggregateCharacters();
    }
    res.json(characters);
  } catch (err) {
    res.status(500).json({error: 'Failed to retrieve characters', details: (err as Error).message});
  }
});


export default router;
