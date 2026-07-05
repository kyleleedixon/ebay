/**
 * Seed search queries. The scanner runs each query, scores every returned
 * listing against its own comps, and keeps anything that clears thresholds.
 *
 * Strategy: focus on graded modern Pokémon — dense sold-comp data, discrete
 * price tiers per grade, frequent mispricings on auctions and "Buy It Now or
 * Best Offer" listings. Expand to sports / vintage once the pipeline proves out.
 */

export type SeedSearch = {
  q: string;
  categoryIds?: string[];
  filter?: string[];
};

// Category IDs from eBay's taxonomy.
const POKEMON_TCG_CATEGORY = "183454";
const SPORTS_BASEBALL_CATEGORY = "213";
const SPORTS_BASKETBALL_CATEGORY = "214";
const SPORTS_FOOTBALL_CATEGORY = "215";

const baseFilters = [
  "buyingOptions:{FIXED_PRICE|BEST_OFFER|AUCTION}",
  "itemLocationCountry:US",
  "deliveryCountry:US",
  "conditionIds:{1000|2750|3000}",
];

export const SEED_SEARCHES: SeedSearch[] = [
  // Pokémon — high-value graded chase cards
  { q: "Charizard PSA 10", categoryIds: [POKEMON_TCG_CATEGORY], filter: baseFilters },
  { q: "Charizard PSA 9", categoryIds: [POKEMON_TCG_CATEGORY], filter: baseFilters },
  { q: "Moonbreon Umbreon VMAX Alt Art PSA 10", categoryIds: [POKEMON_TCG_CATEGORY], filter: baseFilters },
  { q: "Pikachu VMAX Rainbow PSA 10", categoryIds: [POKEMON_TCG_CATEGORY], filter: baseFilters },
  { q: "Lugia V Alt Art PSA 10", categoryIds: [POKEMON_TCG_CATEGORY], filter: baseFilters },
  { q: "Giratina V Alt Art PSA 10", categoryIds: [POKEMON_TCG_CATEGORY], filter: baseFilters },
  { q: "Pokemon 151 Booster Box", categoryIds: [POKEMON_TCG_CATEGORY], filter: baseFilters },
  { q: "Prismatic Evolutions ETB sealed", categoryIds: [POKEMON_TCG_CATEGORY], filter: baseFilters },
  { q: "Pokemon Base Set Shadowless PSA", categoryIds: [POKEMON_TCG_CATEGORY], filter: baseFilters },
  { q: "Pokemon 1st Edition PSA 9", categoryIds: [POKEMON_TCG_CATEGORY], filter: baseFilters },

  // Baseball — Bowman Chrome rookie autos are the most-traded segment.
  { q: "Bowman Chrome auto PSA 10", categoryIds: [SPORTS_BASEBALL_CATEGORY], filter: baseFilters },
  { q: "Bowman Chrome auto BGS 9.5", categoryIds: [SPORTS_BASEBALL_CATEGORY], filter: baseFilters },
  { q: "Topps Chrome refractor PSA 10", categoryIds: [SPORTS_BASEBALL_CATEGORY], filter: baseFilters },
  { q: "Topps rookie PSA 9", categoryIds: [SPORTS_BASEBALL_CATEGORY], filter: baseFilters },

  // Basketball — Prizm and Select rookies dominate.
  { q: "Panini Prizm rookie PSA 10", categoryIds: [SPORTS_BASKETBALL_CATEGORY], filter: baseFilters },
  { q: "Panini Select rookie PSA 10", categoryIds: [SPORTS_BASKETBALL_CATEGORY], filter: baseFilters },
  { q: "Donruss Optic rookie PSA 10", categoryIds: [SPORTS_BASKETBALL_CATEGORY], filter: baseFilters },
  { q: "Panini Mosaic rookie PSA 10", categoryIds: [SPORTS_BASKETBALL_CATEGORY], filter: baseFilters },

  // Football — Prizm rookies + Contenders autos.
  { q: "Panini Prizm rookie PSA 10", categoryIds: [SPORTS_FOOTBALL_CATEGORY], filter: baseFilters },
  { q: "Panini Contenders auto PSA 10", categoryIds: [SPORTS_FOOTBALL_CATEGORY], filter: baseFilters },
  { q: "Donruss Optic rookie PSA 10", categoryIds: [SPORTS_FOOTBALL_CATEGORY], filter: baseFilters },
];
