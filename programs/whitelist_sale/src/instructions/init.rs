use crate::instructions::whitelist::Whitelist;
use anchor_lang::prelude::*;
use anchor_spl::{
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::DataV2, CreateMetadataAccountsV3,
        Metadata as MPL_TOKEN_METADATA,
    },
    token::{Mint, Token},
};

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct InitTokenParams {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
}

#[derive(Accounts)]
#[instruction(
    params: InitTokenParams
)]
pub struct InitToken<'info> {
    /// CHECK: New Metaplex Account being created
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    #[account(
        init,
        seeds = [b"mint"],
        bump,
        payer = payer,
        mint::decimals = params.decimals,
        mint::authority = mint,
    )]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        seeds = [b"whitelist"],
        bump,
        payer = payer,
        space = 8 + (32*10)
    )]
    pub whitelist: Account<'info, Whitelist>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub mpl_token_metadata_program: Program<'info, MPL_TOKEN_METADATA>,
}

pub fn init_token_(ctx: Context<InitToken>, metadata: InitTokenParams) -> Result<()> {
    let seeds = &["mint".as_bytes(), &[ctx.bumps.mint]];
    let signer_seeds = [&seeds[..]];

    let token_data: DataV2 = DataV2 {
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
        uses: None,
    };

    let metadata_ctx = CpiContext::new_with_signer(
        ctx.accounts.mpl_token_metadata_program.to_account_info(),
        CreateMetadataAccountsV3 {
            payer: ctx.accounts.payer.to_account_info(),
            update_authority: ctx.accounts.mint.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            metadata: ctx.accounts.metadata.to_account_info(),
            mint_authority: ctx.accounts.mint.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        },
        &signer_seeds,
    );

    create_metadata_accounts_v3(metadata_ctx, token_data, false, true, None)?;
    msg!("Token mint created successfully.");

    let whitelist = &mut ctx.accounts.whitelist;
    whitelist.users.push(ctx.accounts.payer.key());

    Ok(())
}
