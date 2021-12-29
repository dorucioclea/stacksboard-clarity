import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v0.20.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import hash from "https://deno.land/x/object_hash@2.0.3.1/mod.ts";
import { Client } from "../src/client.ts";
import {
  ErrCode,
  MAX_SUPPLY,
  EXAMPLE_FOR_SALE,
  EXAMPLE_PRICE,
  EXAMPLE_FOR_SALE_2,
  EXAMPLE_PRICE_2,
  EXAMPLE_DATA,
  EXAMPLE_DATA_2,
} from "../src/constants.ts";
import { formatBuffString } from "../src/utils.ts";

const getWalletsAndClient = (chain: Chain, accounts: Map<string, Account>) => {
  const deployer = accounts.get("deployer")!;
  const wallet_1 = accounts.get("wallet_1")!;
  const wallet_2 = accounts.get("wallet_2")!;
  const wallet_3 = accounts.get("wallet_3")!;
  const client = new Client(chain, deployer);
  return { deployer, wallet_1, wallet_2, wallet_3, client };
};

Clarinet.test({
  name: "Ensure that first mint works",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, client } = getWalletsAndClient(
      chain,
      accounts
    );

    let block = chain.mineBlock([
      client.mint(
        0,
        EXAMPLE_FOR_SALE,
        EXAMPLE_PRICE,
        formatBuffString(hash(EXAMPLE_DATA)),
        wallet_1
      ),
    ]);

    block.receipts[0].result.expectOk().expectUint(0);

    // check that two events occurred
    assertEquals(block.receipts[0].events.length, 2);

    block.receipts[0].events.expectSTXTransferEvent(
      600000000,
      wallet_1.address,
      deployer.address
    );

    block.receipts[0].events.expectNonFungibleTokenMintEvent(
      types.uint(0),
      wallet_1.address,
      `${deployer.address}.stacks-board-slot`,
      `stacks-board-slot`
    );

    // check that slots counter updated
    client.getLastTokenId().result.expectOk().expectUint(1);

    // check that slots map updated
    let actualSlotResult = client
      .getSlotInfo(0)
      .result.expectSome()
      .expectTuple();

    let expectedSlotResult = {
      "for-sale": types.bool(EXAMPLE_FOR_SALE),
      price: types.uint(EXAMPLE_PRICE),
      minted: types.bool(true),
      "data-hash": types.buff(formatBuffString(hash(EXAMPLE_DATA))),
      approval: wallet_1.address,
    };

    assertEquals(actualSlotResult, expectedSlotResult);

    // check that owner is wallet_1
    client
      .getOwner(0)
      .result.expectOk()
      .expectSome()
      .expectPrincipal(wallet_1.address);

    // ensure can't mint same tier and slot again
    block = chain.mineBlock([
      client.mint(
        0,
        EXAMPLE_FOR_SALE,
        EXAMPLE_PRICE,
        formatBuffString(hash(EXAMPLE_DATA)),
        wallet_2
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_ALREADY_MINTED);
    assertEquals(block.receipts[0].events.length, 0);

    client.getLastTokenId().result.expectOk().expectUint(1);

    const emptyWallet = accounts.get("wallet_9");
    block = chain.mineBlock([
      client.mint(
        1,
        EXAMPLE_FOR_SALE,
        EXAMPLE_PRICE,
        formatBuffString(hash(EXAMPLE_DATA)),
        emptyWallet!
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(1);

    // make sure that slot counter didn't change
    client.getLastTokenId().result.expectOk().expectUint(1);
  },
});

Clarinet.test({
  name: "Ensure owner can change info about their nft",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, client } = getWalletsAndClient(
      chain,
      accounts
    );

    let block = chain.mineBlock([
      client.mint(
        0,
        EXAMPLE_FOR_SALE,
        EXAMPLE_PRICE,
        formatBuffString(hash(EXAMPLE_DATA)),
        wallet_1
      ),
    ]);
    assertEquals(block.height, 2);
    block.receipts[0].result.expectOk().expectUint(0);

    // update slot info
    block = chain.mineBlock([
      client.updateSlot(
        0,
        EXAMPLE_FOR_SALE_2,
        EXAMPLE_PRICE_2,
        formatBuffString(hash(EXAMPLE_DATA_2)),
        wallet_1
      ),
    ]);

    // check that slots map updated
    let actualSlotResult = client
      .getSlotInfo(0)
      .result.expectSome()
      .expectTuple();

    let expectedSlotResult = {
      "for-sale": types.bool(EXAMPLE_FOR_SALE_2),
      price: types.uint(EXAMPLE_PRICE_2),
      minted: types.bool(true),
      "data-hash": types.buff(formatBuffString(hash(EXAMPLE_DATA_2))),
      approval: wallet_1.address,
    };
    assertEquals(actualSlotResult, expectedSlotResult);

    // ensure someone can't edit a slot they don't own
    block = chain.mineBlock([
      client.updateSlot(
        0,
        EXAMPLE_FOR_SALE,
        EXAMPLE_PRICE,
        formatBuffString(hash(EXAMPLE_DATA)),
        deployer
      ),
    ]);

    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_AUTHORIZED);

    // check that updating approval doesn't mess up the rest of slot map info
    block = chain.mineBlock([
      client.setApprovalFor(0, wallet_2.address, wallet_1),
    ]);

    actualSlotResult = client.getSlotInfo(0).result.expectSome().expectTuple();

    expectedSlotResult = {
      "for-sale": types.bool(EXAMPLE_FOR_SALE_2),
      price: types.uint(EXAMPLE_PRICE_2),
      minted: types.bool(true),
      "data-hash": types.buff(formatBuffString(hash(EXAMPLE_DATA_2))),
      approval: wallet_2.address,
    };
    assertEquals(actualSlotResult, expectedSlotResult);
  },
});

Clarinet.test({
  name: "Ensure transfer works",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, client } = getWalletsAndClient(
      chain,
      accounts
    );

    let block = chain.mineBlock([
      client.mint(
        0,
        EXAMPLE_FOR_SALE,
        EXAMPLE_PRICE,
        formatBuffString(hash(EXAMPLE_DATA)),
        wallet_1
      ),
    ]);

    assertEquals(block.height, 2);
    block.receipts[0].result.expectOk().expectUint(0);

    // wallet 1 owns nft, deployer shouldn't be able to transfer
    block = chain.mineBlock([
      client.transfer(0, deployer.address, wallet_2.address, wallet_1),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_AUTHORIZED);

    // transfer to wallet 2
    block = chain.mineBlock([
      client.transfer(0, wallet_1.address, wallet_2.address, wallet_1),
    ]);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet_1.address,
      wallet_2.address,
      `${deployer.address}.stacks-board-slot`,
      `stacks-board-slot`
    );

    // check that owner is now wallet_2
    client
      .getOwner(0)
      .result.expectOk()
      .expectSome()
      .expectPrincipal(wallet_2.address);

    // ensure that wallet_1 cannot still transfer
    block = chain.mineBlock([
      client.transfer(0, wallet_2.address, deployer.address, wallet_1),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_AUTHORIZED);

    // transfer back to wallet 1
    block = chain.mineBlock([
      client.transfer(0, wallet_2.address, wallet_1.address, wallet_2),
    ]);

    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet_2.address,
      wallet_1.address,
      `${deployer.address}.stacks-board-slot`,
      `stacks-board-slot`
    );

    // check that owner is now wallet_1 again
    client
      .getOwner(0)
      .result.expectOk()
      .expectSome()
      .expectPrincipal(wallet_1.address);
  },
});

Clarinet.test({
  name: "Ensure approval works",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, wallet_3, client } =
      getWalletsAndClient(chain, accounts);

    let block = chain.mineBlock([
      client.mint(
        0,
        EXAMPLE_FOR_SALE,
        EXAMPLE_PRICE,
        formatBuffString(hash(EXAMPLE_DATA)),
        wallet_1
      ),
    ]);

    assertEquals(block.height, 2);
    block.receipts[0].result.expectOk().expectUint(0);

    // wallet 1 owns nft, deployer shouldn't be able to transfer
    block = chain.mineBlock([
      client.transfer(0, deployer.address, wallet_2.address, wallet_1),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_AUTHORIZED);

    // check deployer can't give approval to themself
    block = chain.mineBlock([
      client.setApprovalFor(0, deployer.address, deployer),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_AUTHORIZED);

    // give approval to deployer
    block = chain.mineBlock([
      client.setApprovalFor(0, deployer.address, wallet_1),
    ]);

    // check if deployer is approver for id 0
    client
      .getApproval(0)
      .result.expectOk()
      .expectSome()
      .expectPrincipal(deployer.address);

    // check wallet 1 still owner for id 0
    client
      .getOwner(0)
      .result.expectOk()
      .expectSome()
      .expectPrincipal(wallet_1.address);

    // check deployer can transfer to wallet 2
    block = chain.mineBlock([
      client.transfer(0, wallet_1.address, wallet_2.address, deployer),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet_1.address,
      wallet_2.address,
      `${deployer.address}.stacks-board-slot`,
      `stacks-board-slot`
    );

    // check that owner is now wallet_2
    client
      .getOwner(0)
      .result.expectOk()
      .expectSome()
      .expectPrincipal(wallet_2.address);

    // check that approval for id 0 is wallet 2
    client
      .getApproval(0)
      .result.expectOk()
      .expectSome()
      .expectPrincipal(wallet_2.address);

    // check that deployer can no longer transfer id 0
    block = chain.mineBlock([
      client.transfer(0, wallet_2.address, wallet_3.address, deployer),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_AUTHORIZED);
  },
});

Clarinet.test({
  name: "Ensure can purchase",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, wallet_3, client } =
      getWalletsAndClient(chain, accounts);

    let block = chain.mineBlock([
      client.mint(
        0,
        EXAMPLE_FOR_SALE,
        EXAMPLE_PRICE,
        formatBuffString(hash(EXAMPLE_DATA)),
        wallet_1
      ),
    ]);
    block.receipts[0].result.expectOk().expectUint(0);

    // purchase slot 0
    block = chain.mineBlock([client.purchase(0, wallet_2)]);
    block.receipts[0].result.expectOk().expectBool(true);

    // check that three events occurred
    assertEquals(block.receipts[0].events.length, 3);

    block.receipts[0].events.expectSTXTransferEvent(
      9500000,
      wallet_2.address,
      wallet_1.address
    );

    block.receipts[0].events.expectSTXTransferEvent(
      500000,
      wallet_2.address,
      deployer.address
    );

    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet_1.address,
      wallet_2.address,
      `${deployer.address}.stacks-board-slot`,
      `stacks-board-slot`
    );

    // change royalty fee
    block = chain.mineBlock([client.setRoyalty(1000, deployer)]);
    block.receipts[0].result.expectOk().expectBool(true);

    // check was changed
    client.getRoyalty().result.expectOk().expectUint(1000);

    // purchase it from wallet 3
    block = chain.mineBlock([client.purchase(0, wallet_3)]);
    block.receipts[0].result.expectOk().expectBool(true);

    // check that three events occurred
    assertEquals(block.receipts[0].events.length, 3);

    block.receipts[0].events.expectSTXTransferEvent(
      9000000,
      wallet_3.address,
      wallet_2.address
    );

    block.receipts[0].events.expectSTXTransferEvent(
      1000000,
      wallet_3.address,
      deployer.address
    );

    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet_2.address,
      wallet_3.address,
      `${deployer.address}.stacks-board-slot`,
      `stacks-board-slot`
    );
  },
});

Clarinet.test({
  name: "Ensure can purchase and update",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, client } = getWalletsAndClient(
      chain,
      accounts
    );

    let block = chain.mineBlock([
      client.mint(
        0,
        EXAMPLE_FOR_SALE,
        EXAMPLE_PRICE,
        formatBuffString(hash(EXAMPLE_DATA)),
        wallet_1
      ),
    ]);
    block.receipts[0].result.expectOk().expectUint(0);

    // purchase and update
    block = chain.mineBlock([
      client.purchaseAndUpdateSlot(
        0,
        EXAMPLE_FOR_SALE_2,
        EXAMPLE_PRICE_2,
        formatBuffString(hash(EXAMPLE_DATA_2)),
        wallet_2
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    block.receipts[0].events.expectSTXTransferEvent(
      9500000,
      wallet_2.address,
      wallet_1.address
    );

    block.receipts[0].events.expectSTXTransferEvent(
      500000,
      wallet_2.address,
      deployer.address
    );

    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet_1.address,
      wallet_2.address,
      `${deployer.address}.stacks-board-slot`,
      `stacks-board-slot`
    );
    // check that slots map updated
    let actualSlotResult: any = client
      .getSlotInfo(0)
      .result.expectSome()
      .expectTuple();

    let expectedSlotResult: any = {
      "for-sale": types.bool(EXAMPLE_FOR_SALE_2),
      price: types.uint(EXAMPLE_PRICE_2),
      minted: types.bool(true),
      "data-hash": types.buff(formatBuffString(hash(EXAMPLE_DATA_2))),
      approval: wallet_2.address,
    };
    assertEquals(actualSlotResult, expectedSlotResult);
  },
});

Clarinet.test({
  name: "Ensure can't purchase if not for sale",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, client } = getWalletsAndClient(
      chain,
      accounts
    );

    let block = chain.mineBlock([
      client.mint(
        0,
        false,
        EXAMPLE_PRICE,
        formatBuffString(hash(EXAMPLE_DATA)),
        wallet_1
      ),
    ]);
    block.receipts[0].result.expectOk().expectUint(0);

    // attempt to purchase slot 0
    block = chain.mineBlock([client.purchase(0, wallet_2)]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_FOR_SALE);
  },
});

Clarinet.test({
  name: "Ensure can't mint more than limit",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, client } = getWalletsAndClient(
      chain,
      accounts
    );
    let block;
    for (let i = 0; i < MAX_SUPPLY; i++) {
      block = chain.mineBlock([
        client.mint(
          i,
          EXAMPLE_FOR_SALE,
          EXAMPLE_PRICE,
          formatBuffString(hash(EXAMPLE_DATA)),
          wallet_1
        ),
      ]);
      block.receipts[0].result.expectOk().expectUint(i);
    }

    client.getLastTokenId().result.expectOk().expectUint(MAX_SUPPLY);

    // attempt to mint another
    block = chain.mineBlock([
      client.mint(
        MAX_SUPPLY,
        EXAMPLE_FOR_SALE,
        EXAMPLE_PRICE,
        formatBuffString(hash(EXAMPLE_DATA)),
        wallet_1
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_UNKNOWN_ID);

    client.getLastTokenId().result.expectOk().expectUint(MAX_SUPPLY);
  },
});

Clarinet.test({
  name: "Ensure can freeze metadata",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, client } = getWalletsAndClient(chain, accounts);
    client
      .getTokenUri(0)
      .result.expectOk()
      .expectSome()
      .expectAscii("https://www.stacksboard.art/metadata/");

    // wallet 1 cant change token uri since not contract owner
    let block = chain.mineBlock([
      client.setTokenUri("ipfs://www.stacksboard.art/metadata/", wallet_1),
    ]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_AUTHORIZED);

    // deployer can
    block = chain.mineBlock([
      client.setTokenUri("ipfs://www.stacksboard.art/metadata/", deployer),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    client
      .getTokenUri(0)
      .result.expectOk()
      .expectSome()
      .expectAscii("ipfs://www.stacksboard.art/metadata/");

    // wallet 1 cant freeze since not contract owner
    block = chain.mineBlock([client.freezeMetadata(wallet_1)]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_AUTHORIZED);

    //deployer can
    block = chain.mineBlock([client.freezeMetadata(deployer)]);
    block.receipts[0].result.expectOk().expectBool(true);

    // deployer can't change back
    block = chain.mineBlock([
      client.setTokenUri("https://www.stacks.co/", deployer),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(ErrCode.ERR_METADATA_FROZEN);

    client
      .getTokenUri(0)
      .result.expectOk()
      .expectSome()
      .expectAscii("ipfs://www.stacksboard.art/metadata/");
  },
});

Clarinet.test({
  name: "Ensure can burn",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, client } = getWalletsAndClient(chain, accounts);
    let block = chain.mineBlock([
      client.mint(
        0,
        EXAMPLE_FOR_SALE,
        EXAMPLE_PRICE,
        formatBuffString(hash(EXAMPLE_DATA)),
        wallet_1
      ),
    ]);
    block.receipts[0].result.expectOk().expectUint(0);

    // deployer can't burn because not owner
    block = chain.mineBlock([client.burn(0, deployer)]);
    block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_NOT_AUTHORIZED);

    block = chain.mineBlock([client.burn(0, wallet_1)]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenBurnEvent(
      types.uint(0),
      wallet_1.address,
      `${deployer.address}.stacks-board-slot`,
      `stacks-board-slot`
    );

    const actualSlotResult = client
      .getSlotInfo(0)
      .result.expectSome()
      .expectTuple();

    const expectedSlotResult = {
      approval: `SP000000000000000000002Q6VF78`,
      "data-hash":
        "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000",
      "for-sale": types.bool(false),
      minted: types.bool(true),
      price: types.uint(0),
    };
    assertEquals(actualSlotResult, expectedSlotResult);
  },
});
