import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
  ReadOnlyFn,
} from "https://deno.land/x/clarinet@v0.14.0/index.ts";

export class Client {
  contractName: string = "stacks-board-slot";
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
    dataHash: ArrayBuffer,
    sender: Account
  ) {
    return Tx.contractCall(
      this.contractName,
      "mint",
      [
        types.uint(id),
        types.bool(forSale),
        types.uint(price),
        types.buff(dataHash),
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
    dataHash: ArrayBuffer,
    sender: Account
  ) {
    return Tx.contractCall(
      this.contractName,
      "update-slot",
      [
        types.uint(id),
        types.bool(forSale),
        types.uint(price),
        types.buff(dataHash),
      ],
      sender?.address
    );
  }

  purchase(id: number, sender: Account) {
    return Tx.contractCall(
      this.contractName,
      "purchase",
      [types.uint(id)],
      sender?.address
    );
  }

  purchaseAndUpdateSlot(
    id: number,
    forSale: boolean,
    price: number,
    dataHash: ArrayBuffer,
    sender: Account
  ) {
    return Tx.contractCall(
      this.contractName,
      "purchase-and-update-slot",
      [
        types.uint(id),
        types.bool(forSale),
        types.uint(price),
        types.buff(dataHash),
      ],
      sender?.address
    );
  }

  setRoyalty(percentage: number, sender: Account) {
    return Tx.contractCall(
      this.contractName,
      "set-royalty",
      [types.uint(percentage)],
      sender?.address
    );
  }

  setApprovalFor(id: number, approval: string, sender: Account) {
    return Tx.contractCall(
      this.contractName,
      "set-approval-for",
      [types.uint(id), types.principal(approval)],
      sender?.address
    );
  }

  setTokenUri(newTokenUri: string, sender: Account) {
    return Tx.contractCall(
      this.contractName,
      "set-token-uri",
      [types.ascii(newTokenUri)],
      sender.address
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

  getApproval(id: number) {
    return this.callReadOnlyFn("get-approval", [types.uint(id)]);
  }

  getTier(tier: number) {
    return this.callReadOnlyFn("get-tier", [types.uint(tier)]);
  }

  getSlotInfo(id: number) {
    return this.callReadOnlyFn("get-slot-info", [types.uint(id)]);
  }

  getRoyalty() {
    return this.callReadOnlyFn("get-royalty");
  }
}
