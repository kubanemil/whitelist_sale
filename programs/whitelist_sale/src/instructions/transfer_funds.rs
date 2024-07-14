use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct TransferLamports<'info> {
    #[account(mut)]
    pub from: Signer<'info>,
    #[account(mut)]
    /// CHECK: destination account
    pub to: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

pub fn transfer_lamports_(ctx: Context<TransferLamports>, amount: u64) -> Result<()> {
    let from_account = &ctx.accounts.from;
    let to_account = &ctx.accounts.to;

    let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
        from_account.key,
        to_account.key,
        amount,
    );

    anchor_lang::solana_program::program::invoke_signed(
        &transfer_instruction,
        &[
            from_account.to_account_info(),
            to_account.clone(),
            ctx.accounts.system_program.to_account_info(),
        ],
        &[],
    )?;

    Ok(())
}
