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
  CollectionErrCode,
  MAX_SUPPLY,
  EXAMPLE_FOR_SALE,
  EXAMPLE_PRICE,
  EXAMPLE_FOR_SALE_2,
  EXAMPLE_PRICE_2,
  EXAMPLE_DATA,
  EXAMPLE_DATA_2,
} from "../src/constants.ts";
import { formatBuffString } from "../src/utils.ts";
import { CollectionClient } from "../src/collectionClient.ts";

const commissionAddress1 = "SPGAKH27HF1T170QET72C727873H911BKNMPF8YB";

const getWalletsAndClient = (chain: Chain, accounts: Map<string, Account>) => {
  const deployer = accounts.get("deployer")!;
  const wallet_1 = accounts.get("wallet_1")!;
  const wallet_2 = accounts.get("wallet_2")!;
  const wallet_3 = accounts.get("wallet_3")!;
  const client = new CollectionClient(chain, deployer);
  return { deployer, wallet_1, wallet_2, wallet_3, client };
};

Clarinet.test({
  name: "Collection-board-slot: Ensure that first mint works",
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
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_1
      ),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);

    // check that two events occurred
    assertEquals(block.receipts[0].events.length, 2);

    block.receipts[0].events.expectSTXTransferEvent(
      100000000,
      wallet_1.address,
      deployer.address
    );

    block.receipts[0].events.expectNonFungibleTokenMintEvent(
      types.uint(0),
      wallet_1.address,
      `${deployer.address}.crashpunks-board-slot`,
      `crashpunks-board-slot`
    );

    // check that slots counter updated
    client.getLastTokenId().result.expectOk().expectUint(0);

    // check that slots map updated
    let actualSlotInfo = client
      .getSlotInfo(0)
      .result.expectSome()
      .expectTuple();

    let expectedSlotInfo = {
      "data-hash": types.buff(formatBuffString(hash(EXAMPLE_DATA))),
      "base-nft-id": types.uint(1),
    };

    assertEquals(actualSlotInfo, expectedSlotInfo);

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
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_2
      ),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(CollectionErrCode.ERR_ALREADY_MINTED);
    assertEquals(block.receipts[0].events.length, 0);

    client.getLastTokenId().result.expectOk().expectUint(0);

    const emptyWallet = accounts.get("wallet_9");
    block = chain.mineBlock([
      client.mint(
        1,
        EXAMPLE_FOR_SALE,
        EXAMPLE_PRICE,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        emptyWallet!
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(1);

    // make sure that slot counter didn't change
    client.getLastTokenId().result.expectOk().expectUint(0);
  },
});

Clarinet.test({
  name: "Collection-board-slot: Ensure owner can change info about their nft",
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
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_1
      ),
    ]);
    assertEquals(block.height, 2);
    block.receipts[0].result.expectOk().expectBool(true);

    // update slot info
    block = chain.mineBlock([
      client.updateSlot(
        0,
        EXAMPLE_FOR_SALE_2,
        EXAMPLE_PRICE_2,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA_2)),
        1,
        wallet_1
      ),
    ]);

    // check that slots map updated
    let actualSlotInfo = client
      .getSlotInfo(0)
      .result.expectSome()
      .expectTuple();

    let expectedSlotInfo = {
      "data-hash": types.buff(formatBuffString(hash(EXAMPLE_DATA_2))),
      "base-nft-id": types.uint(1),
    };
    assertEquals(actualSlotInfo, expectedSlotInfo);

    // ensure someone can't edit a slot they don't own
    block = chain.mineBlock([
      client.updateSlot(
        0,
        EXAMPLE_FOR_SALE,
        EXAMPLE_PRICE,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        deployer
      ),
    ]);

    block.receipts[0].result
      .expectErr()
      .expectUint(CollectionErrCode.ERR_NOT_OWNER);
  },
});

Clarinet.test({
  name: "Collection-board-slot: Ensure transfer works",
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
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_1
      ),
    ]);

    assertEquals(block.height, 2);
    block.receipts[0].result.expectOk().expectBool(true);

    // wallet 1 owns nft, deployer shouldn't be able to transfer
    block = chain.mineBlock([
      client.transfer(0, wallet_1.address, wallet_2.address, deployer),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(CollectionErrCode.ERR_NOT_AUTHORIZED);

    // transfer to wallet 2
    block = chain.mineBlock([
      client.transfer(0, wallet_1.address, wallet_2.address, wallet_1),
    ]);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet_1.address,
      wallet_2.address,
      `${deployer.address}.crashpunks-board-slot`,
      `crashpunks-board-slot`
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
    block.receipts[0].result
      .expectErr()
      .expectUint(CollectionErrCode.ERR_NOT_AUTHORIZED);

    // transfer back to wallet 1
    block = chain.mineBlock([
      client.transfer(0, wallet_2.address, wallet_1.address, wallet_2),
    ]);

    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet_2.address,
      wallet_1.address,
      `${deployer.address}.crashpunks-board-slot`,
      `crashpunks-board-slot`
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
  name: "Collection-board-slot: Ensure can list and unlist by owner",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { wallet_1, deployer, client } = getWalletsAndClient(chain, accounts);

    let block = chain.mineBlock([
      client.mint(
        0,
        false,
        EXAMPLE_PRICE,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_1
      ),
    ]);

    // shouldn't be listed
    client.getListingInUStx(0).result.expectNone();

    // check that it can't be listed by not the owner
    block = chain.mineBlock([
      client.listInUStx(
        0,
        10000000,
        `${deployer.address}.commission-collection-board`,
        deployer
      ),
    ]);

    block.receipts[0].result
      .expectErr()
      .expectUint(CollectionErrCode.ERR_NOT_OWNER);

    // list for 100 stx
    block = chain.mineBlock([
      client.listInUStx(
        0,
        100000000,
        `${deployer.address}.commission-collection-board`,
        wallet_1
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // check is listed
    assertEquals(client.getListingInUStx(0).result.expectSome().expectTuple(), {
      price: types.uint(100000000),
      commission: `${deployer.address}.commission-collection-board`,
    });

    // check that it can't be unlisted by not the owner
    block = chain.mineBlock([client.unlistInUStx(0, deployer)]);
    block.receipts[0].result
      .expectErr()
      .expectUint(CollectionErrCode.ERR_NOT_OWNER);

    // unlist
    block = chain.mineBlock([client.unlistInUStx(0, wallet_1)]);
    block.receipts[0].result.expectOk().expectBool(true);
    client.getListingInUStx(0).result.expectNone();
  },
});

Clarinet.test({
  name: "Collection-board-slot: Ensure can NFT be listed and bought",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, wallet_3, client } =
      getWalletsAndClient(chain, accounts);

    let block = chain.mineBlock([
      client.mint(
        0,
        false,
        EXAMPLE_PRICE,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_1
      ),
    ]);

    // shouldn't be listed
    client.getListingInUStx(0).result.expectNone();

    // list for 100 stx
    block = chain.mineBlock([
      client.listInUStx(
        0,
        100000000,
        `${deployer.address}.commission-collection-board`,
        wallet_1
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(client.getListingInUStx(0).result.expectSome().expectTuple(), {
      price: types.uint(100000000),
      commission: `${deployer.address}.commission-collection-board`,
    });

    block = chain.mineBlock([
      client.buyInUStx(
        0,
        `${deployer.address}.commission-collection-board`,
        wallet_2
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    block.receipts[0].events.expectSTXTransferEvent(
      100000000,
      wallet_2.address,
      wallet_1.address
    );
    block.receipts[0].events.expectSTXTransferEvent(
      5000000,
      wallet_2.address,
      commissionAddress1
    );

    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet_1.address,
      wallet_2.address,
      `${deployer.address}.crashpunks-board-slot`,
      "crashpunks-board-slot"
    );
  },
});

Clarinet.test({
  name: "Collection-board-slot: Ensure that NFT can't be bought with different commission trait",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, wallet_3, client } =
      getWalletsAndClient(chain, accounts);

    let block = chain.mineBlock([
      client.mint(
        0,
        false,
        EXAMPLE_PRICE,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_1
      ),
    ]);

    // shouldn't be listed
    client.getListingInUStx(0).result.expectNone();

    // list for 100 stx
    block = chain.mineBlock([
      client.listInUStx(
        0,
        100000000,
        `${deployer.address}.commission-collection-board`,
        wallet_1
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(client.getListingInUStx(0).result.expectSome().expectTuple(), {
      price: types.uint(100000000),
      commission: `${deployer.address}.commission-collection-board`,
    });

    block = chain.mineBlock([
      client.buyInUStx(0, `${deployer.address}.commission-nop`, wallet_2),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(CollectionErrCode.ERR_WRONG_COMMISSION);
  },
});

Clarinet.test({
  name: "Collection-board-slot: Ensure NFT can't be bought when unlisted",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, client } = getWalletsAndClient(
      chain,
      accounts
    );

    // mint v1 and upgrade
    let block = chain.mineBlock([
      client.mint(
        0,
        false,
        EXAMPLE_PRICE,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_1
      ),
    ]);
    // shouldn't be listed
    client.getListingInUStx(0).result.expectNone();

    // list for 100 stx
    block = chain.mineBlock([
      client.listInUStx(
        0,
        100000000,
        `${deployer.address}.commission-collection-board`,
        wallet_1
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(client.getListingInUStx(0).result.expectSome().expectTuple(), {
      price: types.uint(100000000),
      commission: `${deployer.address}.commission-collection-board`,
    });

    // unlist
    block = chain.mineBlock([client.unlistInUStx(0, wallet_1)]);
    block.receipts[0].result.expectOk().expectBool(true);
    client.getListingInUStx(0).result.expectNone();

    // wallet 2 trying to buy should fail
    block = chain.mineBlock([
      client.buyInUStx(
        0,
        `${deployer.address}.commission-collection-board`,
        wallet_2
      ),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(CollectionErrCode.ERR_NFT_NOT_LISTED_FOR_SALE);
  },
});

Clarinet.test({
  name: "Collection-board-slot: Ensure NFT can't be transferred when listed",
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
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_1
      ),
    ]);
    // shouldn't be listed
    client.getListingInUStx(0).result.expectNone();

    // list for 100 stx
    block = chain.mineBlock([
      client.listInUStx(
        0,
        100000000,
        `${deployer.address}.commission-collection-board`,
        wallet_1
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    assertEquals(client.getListingInUStx(0).result.expectSome().expectTuple(), {
      price: types.uint(100000000),
      commission: `${deployer.address}.commission-collection-board`,
    });

    // wallet 1 trying to transfer should fail
    block = chain.mineBlock([
      client.transfer(0, wallet_1.address, wallet_2.address, wallet_1),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(CollectionErrCode.ERR_NFT_LISTED);
  },
});

Clarinet.test({
  name: "Collection-board-slot: Ensure can freeze metadata",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, client } = getWalletsAndClient(chain, accounts);

    const firstUri = "www.stackboard.art/logo.png";
    const nextUri = "ipfs/QmdcBZnzSUwAKQdnVMKSkbVYoDD6DBkghPPUAwtVQjpwgq/{id}";
    client.getTokenUri(0).result.expectOk().expectSome().expectAscii(firstUri);

    // wallet 1 cant change token uri since not contract owner
    let block = chain.mineBlock([client.setTokenUri(nextUri, wallet_1)]);
    block.receipts[0].result
      .expectErr()
      .expectUint(CollectionErrCode.ERR_NOT_ADMINISTRATOR);

    // deployer can
    block = chain.mineBlock([client.setTokenUri(nextUri, deployer)]);
    block.receipts[0].result.expectOk().expectBool(true);

    client.getTokenUri(0).result.expectOk().expectSome().expectAscii(nextUri);

    // wallet 1 cant freeze since not contract owner
    block = chain.mineBlock([client.freezeMetadata(wallet_1)]);
    block.receipts[0].result
      .expectErr()
      .expectUint(CollectionErrCode.ERR_NOT_ADMINISTRATOR);

    // deployer can
    block = chain.mineBlock([client.freezeMetadata(deployer)]);
    block.receipts[0].result.expectOk().expectBool(true);

    // deployer can't change back
    block = chain.mineBlock([client.setTokenUri(firstUri, deployer)]);
    block.receipts[0].result
      .expectErr()
      .expectUint(CollectionErrCode.ERR_METADATA_FROZEN);

    client.getTokenUri(0).result.expectOk().expectSome().expectAscii(nextUri);
  },
});

Clarinet.test({
  name: "Collection-board-slot: ensure can burn",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, client } = getWalletsAndClient(chain, accounts);

    // mint v1 and upgrade
    let block = chain.mineBlock([
      client.mint(
        0,
        false,
        EXAMPLE_PRICE,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_1
      ),
    ]);
    // deployer cannot burn
    block = chain.mineBlock([client.burn(0, deployer)]);
    block.receipts[0].result
      .expectErr()
      .expectUint(CollectionErrCode.ERR_NOT_OWNER);

    // wallet 1 can burn
    block = chain.mineBlock([client.burn(0, wallet_1)]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenBurnEvent(
      types.uint(0),
      wallet_1.address,
      `${deployer.address}.crashpunks-board-slot`,
      "crashpunks-board-slot"
    );
  },
});

Clarinet.test({
  name: "Collection-board-slot: ensure can give approval",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, wallet_3, client } =
      getWalletsAndClient(chain, accounts);

    // mint v1 and upgrade
    let block = chain.mineBlock([
      client.mint(
        0,
        false,
        EXAMPLE_PRICE,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_1
      ),
    ]);

    // wallet 1 owns nft 0, deployer can't transfer
    block = chain.mineBlock([
      client.transfer(0, wallet_1.address, wallet_2.address, deployer),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(CollectionErrCode.ERR_NOT_AUTHORIZED);

    // check wallet_2 can give deployer approval to wallet 1's NFT, but deployer still won't be able to transfer it
    block = chain.mineBlock([
      client.setApproved(0, deployer.address, true, wallet_2),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // check deployer can't transfer still
    block = chain.mineBlock([
      client.transfer(0, wallet_1.address, wallet_2.address, deployer),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(CollectionErrCode.ERR_NOT_AUTHORIZED);

    // let wallet 1 transfer to wallet 2
    block = chain.mineBlock([
      client.transfer(0, wallet_1.address, wallet_2.address, wallet_1),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet_1.address,
      wallet_2.address,
      `${deployer.address}.crashpunks-board-slot`,
      "crashpunks-board-slot"
    );

    // deployer should be able to transfer on behalf of wallet 2
    block = chain.mineBlock([
      client.transfer(0, wallet_2.address, wallet_3.address, deployer),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet_2.address,
      wallet_3.address,
      `${deployer.address}.crashpunks-board-slot`,
      "crashpunks-board-slot"
    );
  },
});

Clarinet.test({
  name: "Collection-board-slot: ensure can give and remove approval",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, client } = getWalletsAndClient(
      chain,
      accounts
    );

    // mint v1 and upgrade
    let block = chain.mineBlock([
      client.mint(
        0,
        false,
        EXAMPLE_PRICE,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_1
      ),
    ]);

    // check wallet_1 can give deployer approval to its NFT
    block = chain.mineBlock([
      client.setApproved(0, deployer.address, true, wallet_1),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // deployer should be able to transfer on behalf of wallet 1
    block = chain.mineBlock([
      client.transfer(0, wallet_1.address, wallet_2.address, deployer),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet_1.address,
      wallet_2.address,
      `${deployer.address}.crashpunks-board-slot`,
      "crashpunks-board-slot"
    );

    // transfer nft back to wallet_1
    block = chain.mineBlock([
      client.transfer(0, wallet_2.address, wallet_1.address, wallet_2),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet_2.address,
      wallet_1.address,
      `${deployer.address}.crashpunks-board-slot`,
      "crashpunks-board-slot"
    );

    // remove approval
    chain.mineBlock([client.setApproved(0, deployer.address, false, wallet_1)]);
    block.receipts[0].result.expectOk().expectBool(true);

    // deployer should no longer be able to transfer on behalf of wallet 1
    block = chain.mineBlock([
      client.transfer(0, wallet_1.address, wallet_2.address, deployer),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(CollectionErrCode.ERR_NOT_AUTHORIZED);
  },
});

Clarinet.test({
  name: "Collection-board-slot: ensure can approve all",
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
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_1
      ),
      client.mint(
        1,
        false,
        EXAMPLE_PRICE,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_1
      ),
    ]);

    // check wallet_1 can give deployer approval to its NFT 0
    block = chain.mineBlock([
      client.setApprovedAll(deployer.address, true, wallet_1),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // deployer should be able to transfer nft 0 on behalf of wallet 1
    block = chain.mineBlock([
      client.transfer(0, wallet_1.address, wallet_2.address, deployer),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet_1.address,
      wallet_2.address,
      `${deployer.address}.crashpunks-board-slot`,
      "crashpunks-board-slot"
    );

    // deployer should be able to transfer nft 1 on behalf of wallet 1
    block = chain.mineBlock([
      client.transfer(1, wallet_1.address, wallet_2.address, deployer),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(1),
      wallet_1.address,
      wallet_2.address,
      `${deployer.address}.crashpunks-board-slot`,
      "crashpunks-board-slot"
    );
  },
});

Clarinet.test({
  name: "Collection-board-slot: ensure can approve all but block specified nft",
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
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_1
      ),
      client.mint(
        1,
        false,
        EXAMPLE_PRICE,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_1
      ),
    ]);

    // check wallet_1 can give deployer approval to its NFT 0
    block = chain.mineBlock([
      client.setApprovedAll(deployer.address, true, wallet_1),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // deployer should be able to transfer nft 0 on behalf of wallet 1
    block = chain.mineBlock([
      client.transfer(0, wallet_1.address, wallet_2.address, deployer),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet_1.address,
      wallet_2.address,
      `${deployer.address}.crashpunks-board-slot`,
      "crashpunks-board-slot"
    );

    // block from transfering nft id 1
    block = chain.mineBlock([
      client.setApproved(1, deployer.address, false, wallet_1),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // deployer should not be able to transfer nft 1 on behalf of wallet 1 because blocked
    block = chain.mineBlock([
      client.transfer(1, wallet_1.address, wallet_2.address, deployer),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(CollectionErrCode.ERR_NOT_AUTHORIZED);
  },
});

Clarinet.test({
  name: "Collection-board-slot: Ensure can update",
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
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_1
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // ensure non owner can't update
    block = chain.mineBlock([
      client.updateSlot(
        0,
        true,
        EXAMPLE_PRICE,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA_2)),
        1,
        deployer
      ),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(CollectionErrCode.ERR_NOT_OWNER);

    block = chain.mineBlock([
      client.updateSlot(
        0,
        true,
        EXAMPLE_PRICE,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA_2)),
        1,
        wallet_1
      ),
    ]);

    // check that slots map updated
    let actualSlotInfo = client
      .getSlotInfo(0)
      .result.expectSome()
      .expectTuple();

    let expectedSlotInfo = {
      "data-hash": types.buff(formatBuffString(hash(EXAMPLE_DATA_2))),
      "base-nft-id": types.uint(1),
    };
    assertEquals(actualSlotInfo, expectedSlotInfo);
  },
});

Clarinet.test({
  name: "Collection-board-slot: Ensure can purchase and update",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, wallet_3, client } =
      getWalletsAndClient(chain, accounts);

    let block = chain.mineBlock([
      client.mint(
        0,
        EXAMPLE_FOR_SALE,
        EXAMPLE_PRICE,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_1
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    // make sure it's listed
    assertEquals(client.getListingInUStx(0).result.expectSome().expectTuple(), {
      commission:
        "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.commission-collection-board",
      price: types.uint(EXAMPLE_PRICE),
    });

    // purchase and update
    block = chain.mineBlock([
      client.purchaseAndUpdateSlot(
        0,
        EXAMPLE_FOR_SALE_2,
        EXAMPLE_PRICE_2,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA_2)),
        1,
        wallet_2
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    block.receipts[0].events.expectSTXTransferEvent(
      10000000,
      wallet_2.address,
      wallet_1.address
    );

    block.receipts[0].events.expectSTXTransferEvent(
      500000,
      wallet_2.address,
      commissionAddress1
    );

    block.receipts[0].events.expectNonFungibleTokenTransferEvent(
      types.uint(0),
      wallet_1.address,
      wallet_2.address,
      `${deployer.address}.crashpunks-board-slot`,
      `crashpunks-board-slot`
    );

    // check that slots map updated
    let actualSlotInfo = client
      .getSlotInfo(0)
      .result.expectSome()
      .expectTuple();

    let expectedSlotInfo = {
      "data-hash": types.buff(formatBuffString(hash(EXAMPLE_DATA_2))),
      "base-nft-id": types.uint(1),
    };
    assertEquals(actualSlotInfo, expectedSlotInfo);

    // make sure unlisted
    client.getListingInUStx(0).result.expectNone();

    // make sure can purchase and relist immediately
    block = chain.mineBlock([
      client.updateSlot(
        0,
        true,
        100000000,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA_2)),
        1,
        wallet_2
      ),
      client.purchaseAndUpdateSlot(
        0,
        EXAMPLE_FOR_SALE,
        EXAMPLE_PRICE,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA_2)),
        1,
        wallet_3
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);

    // make sure listed
    assertEquals(client.getListingInUStx(0).result.expectSome().expectTuple(), {
      commission: `${deployer.address}.commission-collection-board`,
      price: types.uint(EXAMPLE_PRICE),
    });
  },
});

Clarinet.test({
  name: "Collection-board-slot: ensure can get discount on mint",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const { deployer, wallet_1, wallet_2, client } = getWalletsAndClient(
      chain,
      accounts
    );
    const stacksboardClient = new Client(chain, deployer);

    // get 25% discount
    let block = chain.mineBlock([
      stacksboardClient.mint(
        0,
        false,
        0,
        formatBuffString(hash(EXAMPLE_DATA)),
        wallet_1
      ),
    ]);
    block.receipts[0].result.expectOk().expectUint(0);

    block = chain.mineBlock([
      client.mint(
        0,
        EXAMPLE_FOR_SALE,
        EXAMPLE_PRICE,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_1,
        0
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectSTXTransferEvent(
      75000000,
      wallet_1.address,
      deployer.address
    );
    block.receipts[0].events.expectNonFungibleTokenMintEvent(
      types.uint(0),
      wallet_1.address,
      `${deployer.address}.crashpunks-board-slot`,
      `crashpunks-board-slot`
    );

    // get 10% discount
    block = chain.mineBlock([
      stacksboardClient.mint(
        100,
        false,
        0,
        formatBuffString(hash(EXAMPLE_DATA)),
        wallet_1
      ),
    ]);
    block.receipts[0].result.expectOk().expectUint(100);

    block = chain.mineBlock([
      client.mint(
        1,
        EXAMPLE_FOR_SALE,
        EXAMPLE_PRICE,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_1,
        100
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectSTXTransferEvent(
      90000000,
      wallet_1.address,
      deployer.address
    );
    block.receipts[0].events.expectNonFungibleTokenMintEvent(
      types.uint(1),
      wallet_1.address,
      `${deployer.address}.crashpunks-board-slot`,
      `crashpunks-board-slot`
    );

    // cannot get discount if v1 nft doesn't exist
    block = chain.mineBlock([
      client.mint(
        1,
        EXAMPLE_FOR_SALE,
        EXAMPLE_PRICE,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_1,
        353
      ),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(CollectionErrCode.ERR_COULDNT_GET_V1_OWNER);

    // cannot get discount if doesnt own v1 nft
    block = chain.mineBlock([
      client.mint(
        1,
        EXAMPLE_FOR_SALE,
        EXAMPLE_PRICE,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_2,
        0
      ),
    ]);
    block.receipts[0].result
      .expectErr()
      .expectUint(CollectionErrCode.ERR_NOT_V1_OWNER);

    // wallet_2 can mint for no discount
    block = chain.mineBlock([
      client.mint(
        2,
        EXAMPLE_FOR_SALE,
        EXAMPLE_PRICE,
        `${deployer.address}.commission-collection-board`,
        formatBuffString(hash(EXAMPLE_DATA)),
        1,
        wallet_2
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectSTXTransferEvent(
      100000000,
      wallet_2.address,
      deployer.address
    );
  },
});
