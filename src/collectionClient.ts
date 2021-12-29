import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
  ReadOnlyFn,
} from "https://deno.land/x/clarinet@v0.21.2/index.ts";

export class CollectionClient {
  contractName: string = "crashpunks-board-slot";
  chain: Chain;
  deployer: Account;

  constructor(chain: Chain, deployer: Account) {
    this.chain = chain;
    this.deployer = deployer;
  }

  private callReadOnlyFn(
    method: string,
    args: Array<any> = [],
    sender: Account = this.deployer
  ): ReadOnlyFn {
    const result = this.chain.callReadOnlyFn(
      this.contractName,
      method,
      args,
      sender?.address
    );

    return result;
  }

  // public functions
  mint(
    id: number,
    forSale: boolean,
    price: number,
    comm: string,
    dataHash: ArrayBuffer,
    baseNftId: number,
    sender: Account,
    ownedStacksboardNftId?: number
  ) {
    return Tx.contractCall(
      this.contractName,
      "mint",
      [
        types.uint(id),
        types.bool(forSale),
        types.uint(price),
        types.principal(comm),
        types.buff(dataHash),
        types.uint(baseNftId),
        ownedStacksboardNftId !== undefined
          ? types.some(types.uint(ownedStacksboardNftId))
          : types.none(),
      ],
      sender?.address
    );
  }

  transfer(id: number, owner: string, recipient: string, sender: Account) {
    return Tx.contractCall(
      this.contractName,
      "transfer",
      [types.uint(id), types.principal(owner), types.principal(recipient)],
      sender?.address
    );
  }

  updateSlot(
    id: number,
    forSale: boolean,
    price: number,
    comm: string,
    dataHash: ArrayBuffer,
    baseNftId: number,
    sender: Account
  ) {
    return Tx.contractCall(
      this.contractName,
      "update-slot",
      [
        types.uint(id),
        types.bool(forSale),
        types.uint(price),
        types.principal(comm),
        types.buff(dataHash),
        types.uint(baseNftId),
      ],
      sender?.address
    );
  }

  purchaseAndUpdateSlot(
    id: number,
    forSale: boolean,
    price: number,
    comm: string,
    dataHash: ArrayBuffer,
    baseNftId: number,
    sender: Account
  ) {
    return Tx.contractCall(
      this.contractName,
      "purchase-and-update-slot",
      [
        types.uint(id),
        types.bool(forSale),
        types.uint(price),
        types.principal(comm),
        types.buff(dataHash),
        types.uint(baseNftId),
      ],
      sender?.address
    );
  }

  setTokenUri(newTokenUri: string, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-token-uri",
      [types.ascii(newTokenUri)],
      sender?.address
    );
  }

  freezeMetadata(sender: Account) {
    return Tx.contractCall(
      this.contractName,
      "freeze-metadata",
      [],
      sender.address
    );
  }

  burn(id: number, sender: Account) {
    return Tx.contractCall(
      this.contractName,
      "burn",
      [types.uint(id)],
      sender.address
    );
  }

  // read only
  getListingInUStx(id: number): ReadOnlyFn {
    return this.callReadOnlyFn("get-listing-in-ustx", [types.uint(id)]);
  }

  getSlotInfo(id: number) {
    return this.callReadOnlyFn("get-slot-info", [types.uint(id)]);
  }

  // SIP-009
  getLastTokenId() {
    return this.callReadOnlyFn("get-last-token-id");
  }

  // SIP-009
  getTokenUri(id: number) {
    return this.callReadOnlyFn("get-token-uri", [types.uint(id)]);
  }

  // SIP-009
  getOwner(id: number) {
    return this.callReadOnlyFn("get-owner", [types.uint(id)]);
  }

  // operable
  isApproved(id: number, address: string): ReadOnlyFn {
    return this.callReadOnlyFn("is-approved", [
      types.uint(id),
      types.principal(address),
    ]);
  }

  // operable
  setApproved(
    id: number,
    operator: string,
    approved: boolean,
    sender: Account
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-approved",
      [types.uint(id), types.principal(operator), types.bool(approved)],
      sender?.address
    );
  }

  setApprovedAll(operator: string, approved: boolean, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-approved-all",
      [types.principal(operator), types.bool(approved)],
      sender?.address
    );
  }

  listInUStx(id: number, price: number, comm: string, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "list-in-ustx",
      [types.uint(id), types.uint(price), types.principal(comm)],
      sender?.address
    );
  }

  unlistInUStx(id: number, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "unlist-in-ustx",
      [types.uint(id)],
      sender?.address
    );
  }

  buyInUStx(id: number, comm: string, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "buy-in-ustx",
      [types.uint(id), types.principal(comm)],
      sender?.address
    );
  }
}
