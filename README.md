# Stacksboard

Stacksboard is a decentralized NFT powered billboard built on Stacks. Each slot is an NFT, and only the owner of a slot is able to update the image displayed, or update the information on the slot. 

## Technical Implementation Details

Stacksboard implements two traits: the SIP9 NFT Trait, and an approvable trait. The approvable trait allows the owner of an NFT to give permission to one other address to transfer on their behalf. This can be used for a truly decentralized marketplace - when I list my item on the marketplace, I give permission to the marketplace to transfer on my behalf, but I keep the NFT in my wallet. Every time the NFT transfers to a new wallet, the approved address is reset.

Slots have tiers - the higher the tier, the more digital real estate there is in that slot on the front end. As a result, these tiers have a higher mint price. These costs are stored in a constant `TIER-TO-MINT-COST`. In addition, each NFT index has an assigned tier to it, which is stored in a constant `ID-TO-TIER`.


## Public Methods

### `mint`
`mint` lets the caller mint a specific NFT id so that they may pick the tier and positioning of their NFT. In addition, they may specify whether it is for sale, and its sale price. Lastly, they may also store a data hash of the information of the slot. The actual information is stored off chain to save space on information stored on chain, but the data hash can be used to verify the integrity of the data stored off chain. Example information includes the image URL, social media handles, or descriptions.

### `update-slot`
only allows the owner of the NFT to update information about their slot, such as whether it's for sale, its sale price, and an updated data-hash.

### `transfer`
part of SIP9 and transfers the NFT from the sender to a new principal

### `purchase`
allows the caller to buy a specified NFT if it is for sale. It will pay the owner and any royalties, then reset the approved address. 

### `purchase-and-update-slot`
will be used when someone buys a slot, and also wishes to update the information on the slot. This will most likely be used over just `purchase`. 

### `set-royalty`
allows the contract owner to change the royalty percentage varable.

### `set-approval-for`
is a part of the approvable trait. Only the owner of an NFT is able to give approval to one other address to transfer the NFT on their behalf.

### `burn`
allows the owner of the NFT to burn it.

### `set-token-uri` 
allows the contract owner to update the token uri only if the metadata hasn't been frozen yet

### `freeze-metadata`
allows the contract owner to freeze metadata so that `set-token-uri` cannot be used to change the token uri


### Read Only Methods

### `get-last-token-id`
is a SIP9 function that lets you get the last token ID.

### `get-token-uri`
is a SIP9 function that lets you get the uri for the metadata

### `get-owner`
is a SIP9 function that lets you get the owner of an NFT

### `get-approval`
is an approvable trait function that lets you get the address that has permission to transfer this NFT. By default, it will be the owner's address.

### `get-slot-info`
lets you get information about an NFT, such as whether it's for sale, its sale price, and its data hash

#### `get-royalty`
lets you get the royalty percentage specified in the contract


## Testing

Testing is done using clarinet. `src/client.ts` is a wrapper around the contract, and can be used to call each function. The actual test is in `tests/stacks-board-slot_test.ts`. 

To test, run `clarinet test`. 
To generate coverage, run `clarinet test --coverage; genhtml coverage.lcov -o coverage`. You can then view the results in `coverage/index.html`. The current function coverage is at 100%.