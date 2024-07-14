use anchor_lang::prelude::*;
use crate::instructions::Config;
use crate::errors::ErrorCode;


#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub config: Account<'info, Config>,
    pub owner: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}


pub fn withdraw_lamports_(ctx: Context<Withdraw>) -> Result<()> {
    if ctx.accounts.config.owner != ctx.accounts.owner.key() {
        return Err(ErrorCode::InvalidOwner.into());
    }

    let from_account = ctx.accounts.config.to_account_info();
    let to_account = ctx.accounts.owner.to_account_info();
    let minimum_balance = ctx.accounts.rent.minimum_balance(from_account.data_len());

    let amount = from_account.get_lamports() - minimum_balance;
    msg!("Config stores {} lamports from minimum {}", from_account.get_lamports(), minimum_balance);
    

    if amount == 0 {
        return Err(ErrorCode::InsufficientFunds.into());
    }

    **from_account.try_borrow_mut_lamports()? -= amount;
    **to_account.try_borrow_mut_lamports()? += amount;

    Ok(())
}
