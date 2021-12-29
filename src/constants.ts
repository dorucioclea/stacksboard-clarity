export const EXAMPLE_IMAGE_URI =
  "https://pbs.twimg.com/profile_images/1322096989006344192/kBrix6oM.jpg";
export const EXAMPLE_OWNER_NAME = "hiro.btc";
export const EXAMPLE_OWNER_URI = "https://twitter.com/hirosystems";
export const EXAMPLE_DESCRIPTION = "Write safe smart contracts";
export const EXAMPLE_FOR_SALE = true;
export const EXAMPLE_PRICE = 10000000;

export const EXAMPLE_DATA = {
  imageUri: EXAMPLE_IMAGE_URI,
  ownerName: EXAMPLE_OWNER_NAME,
  ownerUri: EXAMPLE_OWNER_URI,
  description: EXAMPLE_DESCRIPTION,
};

export const EXAMPLE_IMAGE_URI_2 =
  "https://pbs.twimg.com/profile_images/1364981923341357061/F4lcS0VB_400x400.jpg";
export const EXAMPLE_OWNER_NAME_2 = "muneeb.btc";
export const EXAMPLE_OWNER_URI_2 = "https://twitter.com/muneeb";
export const EXAMPLE_DESCRIPTION_2 =
  "Founder @Stacks smart contracts for #Bitcoin";

export const EXAMPLE_FOR_SALE_2 = false;
export const EXAMPLE_PRICE_2 = 0;

export const EXAMPLE_DATA_2 = {
  imageUri: EXAMPLE_IMAGE_URI_2,
  ownerName: EXAMPLE_OWNER_NAME_2,
  ownerUri: EXAMPLE_OWNER_URI_2,
  description: EXAMPLE_DESCRIPTION_2,
};

// todo: update
export const TOKEN_URI = "";

export enum ErrCode {
  ERR_NOT_AUTHORIZED = 401,
  ERR_ALL_MINTED = 101,
  ERR_ALREADY_MINTED,
  ERR_UNKNOWN_TIER,
  ERR_UNKNOWN_ID,
  ERR_NOT_FOR_SALE,
  ERR_UNKNOWN_OWNER,
  ERR_FAILED_SET_APPROVAL_FOR,
  ERR_METADATA_FROZEN,
}

export enum CollectionErrCode {
  ERR_METADATA_FROZEN = 101,
  ERR_COULDNT_GET_NFT_OWNER = 102,
  ERR_PRICE_WAS_ZERO = 103,
  ERR_NFT_NOT_LISTED_FOR_SALE = 104,
  ERR_NFT_LISTED = 105,
  ERR_COLLECTION_LIMIT_REACHED = 106,
  ERR_WRONG_COMMISSION = 107,
  ERR_ALREADY_MINTED = 108,
  ERR_COULDNT_GET_V1_OWNER = 109,
  ERR_NOT_V1_OWNER = 110,
  ERR_COULDNT_UNWRAP_ID = 111,
  ERR_COULDNT_GET_MINT_PRICE = 112,

  ERR_NOT_AUTHORIZED = 401,
  ERR_NOT_OWNER = 402,
  ERR_NOT_ADMINISTRATOR = 403,
  ERR_NOT_FOUND = 404,
}

export type TierOptions =
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "SAPPHIRE"
  | "RUBY"
  | "EMERALD"
  | "TOPAZ"
  | "DIAMOND";

export const Tiers: { [K in TierOptions]: number } = {
  BRONZE: 0,
  SILVER: 1,
  GOLD: 2,
  PLATINUM: 3,
  SAPPHIRE: 4,
  RUBY: 5,
  EMERALD: 6,
  TOPAZ: 7,
  DIAMOND: 8,
};

export const MAX_SUPPLY = 353;

export const ROYALTY_FEE = 5;
