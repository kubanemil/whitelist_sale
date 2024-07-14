use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
use instructions::*;

declare_id!("C8sbuNSCxsqDZdLSqBi7LUBgTYRtjoqgyLARdMq36pvK");

const TOKEN_PRICE: u64 = 2 * 10u64.pow(9);
const PURCHASE_LIMIT: u64 = 100;

#[program]
mod whitelist_sale {
    use super::*;

    pub fn init_token(ctx: Context<InitToken>, metadata: InitTokenParams) -> Result<()> {
        init_token_(ctx, metadata)?;
        Ok(())
    }

    pub fn purchase_tokens(ctx: Context<PurchaseToken>, quantity: u64) -> Result<()> {
        purchase_tokens_(ctx, quantity)?;
        Ok(())
    }

    pub fn add_to_whitelist(ctx: Context<ManageWhitelist>, user: Pubkey) -> Result<()> {
        add_to_whitelist_(ctx, user)?;
        Ok(())
    }

    pub fn remove_from_whitelist(ctx: Context<ManageWhitelist>, user: Pubkey) -> Result<()> {
        remove_from_whitelist_(ctx, user)?;
        Ok(())
    }

    pub fn transfer_lamports(ctx: Context<TransferLamports>, amount: u64) -> Result<()> {
        transfer_lamports_(ctx, amount)?;
        Ok(())
    }
}
