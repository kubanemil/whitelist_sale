use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::DataV2, CreateMetadataAccountsV3,
        Metadata as MPL_TOKEN_METADATA,
    },
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};

declare_id!("C8sbuNSCxsqDZdLSqBi7LUBgTYRtjoqgyLARdMq36pvK");

const TOKEN_PRICE: u64 = 2 * 10u64.pow(9);
const PURCHASE_LIMIT: u64 = 100;


#[program]
mod whitelist_sale {
    use super::*;

    pub fn init_token(ctx: Context<InitToken>, metadata: InitTokenParams) -> Result<()> {
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

    pub fn add_to_whitelist(ctx: Context<ManageWhitelist>, user: Pubkey) -> Result<()> {
        if !ctx.accounts.whitelist.users.contains(&ctx.accounts.authority.key()) {
            return Err(ErrorCode::NotWhitelisted.into());
        }
        let whitelist = &mut ctx.accounts.whitelist;
        whitelist.users.push(user);
        Ok(())
    }

    pub fn remove_from_whitelist(ctx: Context<ManageWhitelist>, user: Pubkey) -> Result<()> {
        if !ctx.accounts.whitelist.users.contains(&ctx.accounts.authority.key()) {
            return Err(ErrorCode::NotWhitelisted.into());
        }
        let whitelist = &mut ctx.accounts.whitelist;
        if let Some(index) = whitelist.users.iter().position(|x| *x == user) {
            whitelist.users.remove(index);
        }
        Ok(())
    }

    pub fn purchase_tokens(ctx: Context<PurchaseToken>, quantity: u64) -> Result<()> {
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
            &ctx.accounts.receiver.key(),
            cost,
        );
        anchor_lang::solana_program::program::invoke(
            &transfer_ix,
            &[
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.receiver.to_account_info(),
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

    pub fn transfer_lamports(ctx: Context<TransferLamports>, amount: u64) -> Result<()> {
        let from_account = &ctx.accounts.from;
        let to_account = &ctx.accounts.to;

        let transfer_instruction = anchor_lang::solana_program
        ::system_instruction::transfer(from_account.key, to_account.key, amount);

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

#[derive(Accounts)]
pub struct ManageWhitelist<'info> {
    #[account(mut)]
    pub whitelist: Account<'info, Whitelist>,

    pub authority: Signer<'info>,
}

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
    /// CHECK: destination account
    pub receiver: AccountInfo<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct TransferLamports<'info> {
    #[account(mut)]
    pub from: Signer<'info>,
    #[account(mut)]
    /// CHECK: destination account
    pub to: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct InitTokenParams {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
}

#[account]
pub struct Whitelist {
    pub users: Vec<Pubkey>,
}



#[error_code]
pub enum ErrorCode {
    #[msg("You are not whitelisted.")]
    NotWhitelisted,
    #[msg("Purchase limit exceeded.")]
    PurchaseLimitExceeded,
    #[msg("Insufficient funds.")]
    InsufficientFunds,
}
