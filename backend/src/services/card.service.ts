import { Card } from '../models/card.js';
import { LexoRank } from 'lexorank';
import { saveAuditLog } from './audit.service.js';

export const listCardsByList = async (listId: string) => {
  const cards = await Card.find({ listId })
    .sort({ order: 1, _id: 1 });

  return cards;
};

export const createCard = async (
   listId: string, 
   title: string, 
   task: string, 
   
) => {

    const lastCard = await Card.findOne({ listId }).sort({ order: -1 });
        const order = lastCard
          ? LexoRank.parse(lastCard.order).genNext().toString()
          : LexoRank.middle().toString();
    
        const card = await Card.create({ listId, title, task, order });



        console.log(`[BACKEND] Card created: ${card.title} in ${card.listId}`);

        await saveAuditLog("CREATE", `Tarjeta "${card.title}" creada en lista ${card.listId}`);

        return card;

}


export const updateCard = async (
  id: string,
  title: string,
  task: string,
  expectedVersion: number
) => {
  const card = await Card.findOneAndUpdate(
    { _id: id, version: expectedVersion },
    {
      $set: { title, task },
      $inc: { version: 1 }
    },
    { new: true }
  );

  if (!card) {
    const freshCard = await Card.findById(id);

    if (!freshCard) {
      const notFoundError: any = new Error("Tarjeta no encontrada");
      notFoundError.status = 404;
      throw notFoundError;
    }

    const conflictError: any = new Error("La tarjeta cambio y tu vista esta desactualizada");
    conflictError.status = 409;
    conflictError.code = "conflict";
    conflictError.currentCard = {
      id: freshCard.id,
      title: freshCard.title,
      task: freshCard.task,
      listId: freshCard.listId,
      order: freshCard.order,
      version: freshCard.version
    };
    throw conflictError;
  }

  console.log(`[BACKEND] Card updated: ${card.title}`);
  await saveAuditLog("UPDATE", `Tarjeta "${card.title}" actualizada`);

  return card;
};


export const deleteCard = async (
 id: string
) => {
     const card = await Card.findByIdAndDelete(id);
     if (!card) {
        const error: any = new Error("Tarjeta no encontrada");
        error.status = 404;
        throw error
     }

      await saveAuditLog("DELETE", `Tarjeta "${card.title}" eliminada de lista ${card.listId}`);

     return card
}




export const moveCard = async (
  cardId: string,
  listId: string,
  prevOrder?: string,
  nextOrder?: string
) => {

  const cardBeforeMove = await Card.findById(cardId);
  if (!cardBeforeMove) {
    const error: any = new Error("Tarjeta no encontrada");
    error.status = 404;
    throw error;
  }

  let order: string;

  if (!prevOrder && !nextOrder) {

    const destinationHasCards = await Card.exists({
      listId,
      _id: { $ne: cardId }
    });

    if (destinationHasCards) {
      const error: any = new Error(
        "prevOrder y nextOrder son requeridos cuando la lista destino no esta vacia"
      );
      error.status = 400; 
      throw error;
    }

    order = LexoRank.middle().toString();

  } else if (!prevOrder) {

    order = LexoRank.parse(nextOrder!).genPrev().toString();

  } else if (!nextOrder) {

    order = LexoRank.parse(prevOrder!).genNext().toString();

  } else {

    order = LexoRank
      .parse(prevOrder!)
      .between(LexoRank.parse(nextOrder!))
      .toString();
  }

  const card = await Card.findByIdAndUpdate(
    cardId,
    {
      $set: { listId, order },
      $inc: { version: 1 }
    },
    { new: true }
  );

  if (!card) {
    const error: any = new Error("Tarjeta no encontrada");
    error.status = 404;
    throw error;
  }

  await saveAuditLog(
    "MOVE",
    `Tarjeta "${cardBeforeMove.title}" movida a ${listId}`
  );

  return { ok: true, order };
};

type MoveCardRealtimeInput = {
  cardId: string;
  targetListId: string;
  beforeCardId?: string | null;
  afterCardId?: string | null;
  expectedVersion: number;
};

type MoveCardRealtimeResult = {
  cardId: string;
  listId: string;
  order: string;
  version: number;
  updatedAt: Date;
};

type ServiceError = Error & {
  status?: number;
  code?: string;
  currentCard?: {
    id: string;
    listId: string;
    order: string;
    version: number;
  };
};

const buildServiceError = (
  message: string,
  status: number,
  code: string,
  currentCard?: ServiceError["currentCard"]
): ServiceError => {
  const err: ServiceError = new Error(message);
  err.status = status;
  err.code = code;
  err.currentCard = currentCard;
  return err;
};

const getNeighborCard = async (cardId: string, targetListId: string) => {
  const card = await Card.findById(cardId);
  if (!card) {
    throw buildServiceError("Tarjeta vecina no encontrada", 400, "invalid_neighbor");
  }
  if (card.listId !== targetListId) {
    throw buildServiceError("Tarjeta vecina no pertenece a la lista destino", 400, "invalid_neighbor_list");
  }
  return card;
};

export const moveCardRealtime = async (
  input: MoveCardRealtimeInput
): Promise<MoveCardRealtimeResult> => {
  const {
    cardId,
    targetListId,
    beforeCardId = null,
    afterCardId = null,
    expectedVersion
  } = input;

  const currentCard = await Card.findById(cardId);
  if (!currentCard) {
    throw buildServiceError("Tarjeta no encontrada", 404, "not_found");
  }

  if (beforeCardId && beforeCardId === afterCardId) {
    throw buildServiceError("beforeCardId y afterCardId no pueden ser iguales", 400, "invalid_neighbors");
  }

  let order: string;

  if (!beforeCardId && !afterCardId) {
    const destinationHasCards = await Card.exists({
      listId: targetListId,
      _id: { $ne: cardId }
    });

    if (destinationHasCards) {
      throw buildServiceError(
        "beforeCardId y afterCardId son requeridos cuando la lista destino no esta vacia",
        400,
        "missing_neighbors"
      );
    }

    order = LexoRank.middle().toString();
  } else if (!beforeCardId && afterCardId) {
    const afterCard = await getNeighborCard(afterCardId, targetListId);
    order = LexoRank.parse(afterCard.order).genPrev().toString();
  } else if (beforeCardId && !afterCardId) {
    const beforeCard = await getNeighborCard(beforeCardId, targetListId);
    order = LexoRank.parse(beforeCard.order).genNext().toString();
  } else {
    const beforeCard = await getNeighborCard(beforeCardId as string, targetListId);
    const afterCard = await getNeighborCard(afterCardId as string, targetListId);
    order = LexoRank.parse(beforeCard.order).between(LexoRank.parse(afterCard.order)).toString();
  }

  const updatedCard = await Card.findOneAndUpdate(
    { _id: cardId, version: expectedVersion },
    {
      $set: { listId: targetListId, order },
      $inc: { version: 1 }
    },
    { new: true }
  );

  if (!updatedCard) {
    const freshCard = await Card.findById(cardId);
    if (!freshCard) {
      throw buildServiceError("Tarjeta no encontrada", 404, "not_found");
    }


    if (freshCard.version === expectedVersion) {
      const retryCard = await Card.findByIdAndUpdate(
        cardId,
        {
          $set: { listId: targetListId, order },
          $inc: { version: 1 }
        },
        { new: true }
      );

      if (!retryCard) {
        throw buildServiceError("Tarjeta no encontrada", 404, "not_found");
      }

      await saveAuditLog("MOVE", `Tarjeta "${retryCard.title}" movida a ${targetListId}`);

      return {
        cardId: retryCard.id,
        listId: retryCard.listId,
        order: retryCard.order,
        version: retryCard.version,
        updatedAt: retryCard.updatedAt
      };
    }

    throw buildServiceError("La tarjeta cambio y tu vista esta desactualizada", 409, "conflict", {
      id: freshCard.id,
      listId: freshCard.listId,
      order: freshCard.order,
      version: freshCard.version
    });
  }

  await saveAuditLog("MOVE", `Tarjeta "${updatedCard.title}" movida a ${targetListId}`);

  return {
    cardId: updatedCard.id,
    listId: updatedCard.listId,
    order: updatedCard.order,
    version: updatedCard.version,
    updatedAt: updatedCard.updatedAt
  };
};
