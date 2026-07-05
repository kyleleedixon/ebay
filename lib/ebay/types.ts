export type Money = { value: string; currency: string };

export type BrowseItemSummary = {
  itemId: string;
  title: string;
  price: Money;
  itemHref: string;
  itemWebUrl: string;
  condition?: string;
  conditionId?: string;
  shippingOptions?: { shippingCost?: Money }[];
  buyingOptions?: string[];
  seller?: { username?: string; feedbackPercentage?: string; feedbackScore?: number };
  image?: { imageUrl?: string };
  itemEndDate?: string;
};

export type BrowseSearchResponse = {
  total?: number;
  href?: string;
  next?: string;
  itemSummaries?: BrowseItemSummary[];
};

export type SoldItem = {
  itemId: string;
  title: string;
  lastSoldPrice?: Money;
  lastSoldDate?: string;
  condition?: string;
};

export type InsightsResponse = {
  total?: number;
  itemSales?: SoldItem[];
};
