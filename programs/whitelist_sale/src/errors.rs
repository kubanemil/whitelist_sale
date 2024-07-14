use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("You are not whitelisted.")]
    NotWhitelisted,
    #[msg("Purchase limit exceeded.")]
    PurchaseLimitExceeded,
    #[msg("Insufficient funds.")]
    InsufficientFunds,
    #[msg("Invalid owner.")]
    InvalidOwner,
}
