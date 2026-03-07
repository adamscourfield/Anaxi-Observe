import { UserRole } from "@/lib/types";
import { HOME_CARD_CONTRACTS, HomeCardContract, HomeCardId } from "@/modules/home/contracts";

export type HomeAssemblerInput = {
  role: UserRole;
  enabledFeatures: string[];
};

export type HomeAssembly = {
  cards: HomeCardContract[];
  cardIds: Set<HomeCardId>;
  has: (cardId: HomeCardId) => boolean;
};

export function assembleHomeCards(input: HomeAssemblerInput): HomeAssembly {
  const featureSet = new Set(input.enabledFeatures);

  const cards = HOME_CARD_CONTRACTS.filter((contract) => {
    const roleAllowed = contract.roles.includes(input.role);
    if (!roleAllowed) return false;

    return contract.requiredFeatures.every((feature) => featureSet.has(feature));
  });

  const cardIds = new Set<HomeCardId>(cards.map((card) => card.id));

  return {
    cards,
    cardIds,
    has: (cardId: HomeCardId) => cardIds.has(cardId),
  };
}
