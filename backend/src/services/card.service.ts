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


) => {
        const card = await Card.findByIdAndUpdate(
          id,
          { title, task },
          { new: true }
        );
        if (!card) {
           const error: any = new Error("Tarjeta no encontrada");
            error.status = 404;
            throw error;

        }
        console.log(`[BACKEND] Card updated: ${card?.title}`);
    
       
        await saveAuditLog("UPDATE", `Tarjeta "${card.title}" actualizada`);

        return card;
}


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
      error.status = 400; // ✅ CORRECTO
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
    { listId, order },
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

