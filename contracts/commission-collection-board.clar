(define-public (pay (id uint) (price uint))
    (begin
        (try! (stx-transfer? (/ price u20) tx-sender 'SPGAKH27HF1T170QET72C727873H911BKNMPF8YB))
        (ok true)
    )
)
