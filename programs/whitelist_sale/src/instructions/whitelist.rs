use crate::errors::ErrorCode;
use anchor_lang::prelude::*;

#[account]
pub struct Whitelist {
    pub users: Vec<Pubkey>,
}

#[derive(Accounts)]
pub struct ManageWhitelist<'info> {
    #[account(mut)]
    pub whitelist: Account<'info, Whitelist>,

    pub authority: Signer<'info>,
}

pub fn add_to_whitelist_(ctx: Context<ManageWhitelist>, user: Pubkey) -> Result<()> {
    if !ctx
        .accounts
        .whitelist
        .users
        .contains(&ctx.accounts.authority.key())
    {
        return Err(ErrorCode::NotWhitelisted.into());
    }
    let whitelist = &mut ctx.accounts.whitelist;
    whitelist.users.push(user);
    Ok(())
}

pub fn remove_from_whitelist_(ctx: Context<ManageWhitelist>, user: Pubkey) -> Result<()> {
    if !ctx
        .accounts
        .whitelist
        .users
        .contains(&ctx.accounts.authority.key())
    {
        return Err(ErrorCode::NotWhitelisted.into());
    }
    let whitelist = &mut ctx.accounts.whitelist;
    if let Some(index) = whitelist.users.iter().position(|x| *x == user) {
        whitelist.users.remove(index);
    }
    Ok(())
}
