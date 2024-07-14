use crate::errors::ErrorCode;
use crate::instructions::whitelist::Whitelist;
use crate::instructions::Config;
use crate::{PURCHASE_LIMIT, TOKEN_PRICE};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct PurchaseToken<'info> {
    #[account(
        mut,
        seeds = [b"mint"],
        bump,
        mint::authority = mint,
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = payer,
    )]
    pub destination: Account<'info, TokenAccount>,

    #[account(mut)]
    pub whitelist: Account<'info, Whitelist>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub config: Account<'info, Config>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}


pub fn purchase_tokens_(ctx: Context<PurchaseToken>, quantity: u64) -> Result<()> {
    let seeds = &["mint".as_bytes(), &[ctx.bumps.mint]];
    let signer_seeds = [&seeds[..]];

    let buyer = &mut ctx.accounts.payer;

    if !ctx.accounts.whitelist.users.contains(&buyer.key()) {
        return Err(ErrorCode::NotWhitelisted.into());
    }

    if ctx.accounts.destination.amount + quantity > PURCHASE_LIMIT {
        return Err(ErrorCode::PurchaseLimitExceeded.into());
    }

    let cost = TOKEN_PRICE * quantity;
    let buyer_balance = buyer.to_account_info().lamports();

    if buyer_balance < cost {
        return Err(ErrorCode::InsufficientFunds.into());
    }

    let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.payer.key(),
        &ctx.accounts.config.key(),
        cost,
    );
    anchor_lang::solana_program::program::invoke(
        &transfer_ix,
        &[
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.config.to_account_info(),
        ],
    )?;

    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                authority: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.destination.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
            },
            &signer_seeds,
        ),
        quantity,
    )?;

    Ok(())
}
