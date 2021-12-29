;; Interface definitions
(impl-trait .nft-trait.nft-trait)
(impl-trait .operable.operable)

(use-trait commission-trait .commission-trait.commission)

;; contract variables
(define-data-var mint-counter uint u0)

(define-data-var token-uri (string-ascii 246) "www.stackboard.art/collection/megapontapeclub/metadata/")
(define-data-var metadata-frozen bool false)

;; constants
(define-constant MINT-PRICE u100000000)

(define-constant CONTRACT-OWNER contract-caller)
(define-constant token-name "megapont-ape-club-board-slot")
(define-constant COLLECTION-MAX-SUPPLY u60)

(define-constant ERR-METADATA-FROZEN (err u101))
(define-constant ERR-COULDNT-GET-NFT-OWNER (err u102))
(define-constant ERR-PRICE-WAS-ZERO (err u103))
(define-constant ERR-NFT-NOT-LISTED-FOR-SALE (err u104))
(define-constant ERR-NFT-LISTED (err u105))
(define-constant ERR-COLLECTION-LIMIT-REACHED (err u106))
(define-constant ERR-WRONG-COMMISSION (err u107))
(define-constant ERR-ALREADY-MINTED (err u108))
(define-constant ERR-COULDNT-GET-V1-OWNER (err u109))
(define-constant ERR-NOT-V1-OWNER (err u110))
(define-constant ERR-COULDNT-UNWRAP-ID (err u111))

(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-NOT-OWNER (err u402))
(define-constant ERR-NOT-ADMINISTRATOR (err u403))
(define-constant ERR-NOT-FOUND (err u404))

(define-non-fungible-token megapont-ape-club-board-slot uint)

;; data structures
;; slot id -> data hash
(define-map slots-map 
    uint
    {
        data-hash: (buff 40),
        base-nft-id: uint
    }
)

;; {owner, operator, id} -> boolean
;; if {owner, operator, id}->true in map, then operator can perform actions on behalf of owner for this id
(define-map approvals {owner: principal, operator: principal, id: uint} bool)
(define-map approvals-all {owner: principal, operator: principal} bool)

;; id -> {price (in ustx), commission trait}
;; if id is not in map, it is not listed for sale
(define-map market uint {price: uint, commission: principal})

;; whitelist address -> # they can mint
(define-map mint-pass principal uint)

;; SIP-09: get last token id
(define-read-only (get-last-token-id)
  (ok (- (var-get mint-counter) u1))
)

;; SIP-09: URI for metadata associated with the token
(define-read-only (get-token-uri (id uint))
    (ok (some (var-get token-uri)))
)

;; SIP-09: Gets the owner of the 'Specified token ID.
(define-read-only (get-owner (id uint))
  (ok (nft-get-owner? megapont-ape-club-board-slot id))
)

;; SIP-09: Transfer
(define-public (transfer (id uint) (owner principal) (recipient principal))
    (begin
        (asserts! (unwrap! (is-approved id contract-caller) ERR-NOT-AUTHORIZED) ERR-NOT-AUTHORIZED)
        (asserts! (is-none (map-get? market id)) ERR-NFT-LISTED)
        (nft-transfer? megapont-ape-club-board-slot id owner recipient)
    )
)

;; operable
(define-read-only (is-approved (id uint) (operator principal))
    (let ((owner (unwrap! (nft-get-owner? megapont-ape-club-board-slot id) ERR-COULDNT-GET-NFT-OWNER)))
        (ok (is-owned-or-approved id operator owner))
    )
)

;; operable
(define-public (set-approved (id uint) (operator principal) (approved bool))
    (ok (map-set approvals {owner: contract-caller, operator: operator, id: id} approved))
)

(define-public (set-approved-all (operator principal) (approved bool))
    (ok (map-set approvals-all {owner: contract-caller, operator: operator} approved))
)

;; public methods
(define-public (mint
    (id uint)
    (for-sale bool)
    (price uint)
    (comm <commission-trait>)
    (data-hash (buff 40))
    (base-nft-id uint)
    (owned-stacksboard-nft-id (optional uint))
    )
    (let (
            (mintCounter (var-get mint-counter))
            (mintPrice (try! (get-mint-price owned-stacksboard-nft-id)))
        )
        ;; assert we didn't mint more than the limit
        (asserts! (< mintCounter COLLECTION-MAX-SUPPLY) ERR-COLLECTION-LIMIT-REACHED)

        ;; assert we didn't already mint the slot at this tier and index
        (asserts! (is-eq none (map-get? slots-map id)) ERR-ALREADY-MINTED)

        (try! (stx-transfer? mintPrice contract-caller CONTRACT-OWNER))
        (try! (nft-mint? megapont-ape-club-board-slot id contract-caller))
        (var-set mint-counter (+ mintCounter u1))
        (map-set slots-map id {data-hash: data-hash, base-nft-id: base-nft-id})

        (if for-sale 
            (try! (list-in-ustx id price comm))
            (try! (unlist-in-ustx id))
        )

        (ok true)
    )
)


(define-public (update-slot 
    (id uint) 
    (for-sale bool)
    (price uint)
    (comm <commission-trait>)
    (data-hash (buff 40))
    (base-nft-id uint)
    )
    (let ((owner (unwrap! (nft-get-owner? megapont-ape-club-board-slot id) ERR-COULDNT-GET-NFT-OWNER)))

        ;; asserts the owner is the contract-caller
        (asserts! (is-eq owner contract-caller) ERR-NOT-OWNER)

        (if for-sale 
            (try! (list-in-ustx id price comm))
            (try! (unlist-in-ustx id))
        )

        (ok (map-set slots-map id {data-hash: data-hash, base-nft-id: base-nft-id}))
    )
)

(define-public (purchase-and-update-slot
    (id uint)
    (for-sale bool)
    (price uint)
    (comm <commission-trait>)
    (data-hash (buff 40))
    (base-nft-id uint)
    )
    (begin 
        (try! (buy-in-ustx id comm))
        (try! (update-slot id for-sale price comm data-hash base-nft-id))
        (ok true)
    )
)

;; marketplace function
(define-public (list-in-ustx (id uint) (price uint) (comm <commission-trait>))
    (let ((listing {price: price, commission: (contract-of comm)})) 
        (asserts! (is-eq contract-caller (unwrap! (nft-get-owner? megapont-ape-club-board-slot id) ERR-COULDNT-GET-NFT-OWNER)) ERR-NOT-OWNER)
        (asserts! (> price u0) ERR-PRICE-WAS-ZERO)
        (ok (map-set market id listing))
    )
)

;; marketplace function
(define-public (unlist-in-ustx (id uint))
    (begin 
        (asserts! (is-eq contract-caller (unwrap! (nft-get-owner? megapont-ape-club-board-slot id) ERR-COULDNT-GET-NFT-OWNER)) ERR-NOT-OWNER)
        (ok (map-delete market id))
    )
)

;; marketplace function
(define-public (buy-in-ustx (id uint) (comm <commission-trait>))
    (let 
        (
            (listing (unwrap! (map-get? market id) ERR-NFT-NOT-LISTED-FOR-SALE))
            (owner (unwrap! (nft-get-owner? megapont-ape-club-board-slot id) ERR-COULDNT-GET-NFT-OWNER))
            (buyer contract-caller)
            (price (get price listing))
        )
        (asserts! (is-eq (contract-of comm) (get commission listing)) ERR-WRONG-COMMISSION)
        (try! (stx-transfer? price contract-caller owner))
        (try! (contract-call? comm pay id price))
        (try! (nft-transfer? megapont-ape-club-board-slot id owner buyer))
        (map-delete market id)
        (ok true)
    )
)

(define-public (burn (id uint))
    (let ((owner (unwrap! (nft-get-owner? megapont-ape-club-board-slot id) ERR-COULDNT-GET-NFT-OWNER)))
        (asserts! (is-eq owner contract-caller) ERR-NOT-OWNER)
        (map-delete market id)
        (map-set slots-map id {data-hash: 0x00000000000000000000000000000000000000000000000000000000000000000000000000000000, base-nft-id: u0})
        (nft-burn? megapont-ape-club-board-slot id contract-caller)
    )
)

(define-public (set-token-uri (new-token-uri (string-ascii 80)))
    (begin
        (asserts! (is-eq contract-caller CONTRACT-OWNER) ERR-NOT-ADMINISTRATOR)
        (asserts! (not (var-get metadata-frozen)) ERR-METADATA-FROZEN)
        (var-set token-uri new-token-uri)
        (ok true))
)

(define-public (freeze-metadata)
    (begin
        (asserts! (is-eq contract-caller CONTRACT-OWNER) ERR-NOT-ADMINISTRATOR)
        (var-set metadata-frozen true)
        (ok true)
    )
)

;; read only methods
(define-read-only (get-listing-in-ustx (id uint))
    (map-get? market id)
)

(define-read-only (get-slot-info (id uint))
    (map-get? slots-map id)
)

;; private methods
(define-private (is-owned-or-approved (id uint) (operator principal) (owner principal))
    (default-to 
        (default-to
            (is-eq owner operator)
            (map-get? approvals-all {owner: owner, operator: operator})
        )
        (map-get? approvals {owner: owner, operator: operator, id: id})
    )
)

(define-private (get-mint-price (stacksboard-nft-id (optional uint)))
    (if (is-none stacksboard-nft-id)
        (ok MINT-PRICE)
        (let (
                (unwrapped-stacksboard-nft-id (unwrap! stacksboard-nft-id ERR-COULDNT-UNWRAP-ID))
                (stacksboard-owner (unwrap! (unwrap! (contract-call? .stacks-board-slot get-owner unwrapped-stacksboard-nft-id) ERR-COULDNT-GET-V1-OWNER) ERR-COULDNT-GET-V1-OWNER))
            )
            (asserts! (is-eq stacksboard-owner contract-caller) ERR-NOT-V1-OWNER)
            (if (<= unwrapped-stacksboard-nft-id u56)
                (ok (/ (* MINT-PRICE u75) u100))
                (ok (/ (* MINT-PRICE u90) u100))
            )
        )
    )
)

