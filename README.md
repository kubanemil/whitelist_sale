
# Whitelist-Gated Token Sale Anchor Program

ProgramAccount:
[8KeThqsiCyHR7Uez2W2RZFKAxqYWVR2PqU4akDmAWHjT](https://explorer.solana.com/address/8KeThqsiCyHR7Uez2W2RZFKAxqYWVR2PqU4akDmAWHjT?cluster=devnet)

TokenMintInfo:
[2jLRwAqYqT44so51m4cox8u3k8b9nEiqXRACBN7Mikyb](https://explorer.solana.com/address/2jLRwAqYqT44so51m4cox8u3k8b9nEiqXRACBN7Mikyb/metadata?cluster=devnet)


# Intro

This is a Solana program written in Rust using the Anchor framework. The program facilitates a whitelist token sale, allowing users to initialize tokens, purchase tokens, manage whitelists, and withdraw lamports.

## Constants

- `TOKEN_PRICE`: The price of each token (in lamports), set to 2 SOL (2 * 10^9 lamports).
- `PURCHASE_LIMIT`: The maximum number of tokens that can be purchased in a single transaction, set to 100.

## Instructions

### Init Token

Initializes a new token with specified metadata.

#### Params

- `metadata`: `InitTokenParams` - Metadata for the token.
- `InitToken`: The context for initializing a token.

#### Usage

```rust
pub fn init_token(ctx: Context<InitToken>, metadata: InitTokenParams) -> Result<()> {
    init_token_(ctx, metadata)?;
    Ok(())
}
```

### Purchase Tokens

Allows a user to purchase a specified quantity of tokens.

#### Params

- `quantity`: `u64` - The number of tokens to purchase.
- `PurchaseToken`: The context for purchasing tokens.

#### Usage

```rust
pub fn purchase_tokens(ctx: Context<PurchaseToken>, quantity: u64) -> Result<()> {
    purchase_tokens_(ctx, quantity)?;
    Ok(())
}
```

### Add to Whitelist

Adds a user to the whitelist, enabling them to purchase tokens.

#### Params

- `user`: `Pubkey` - The public key of the user to add to the whitelist.
- `ManageWhitelist`: The context for managing the whitelist.

#### Usage

```rust
pub fn add_to_whitelist(ctx: Context<ManageWhitelist>, user: Pubkey) -> Result<()> {
    add_to_whitelist_(ctx, user)?;
    Ok(())
}
```

### Remove from Whitelist

Removes a user from the whitelist, preventing them from purchasing tokens.

#### Params

- `user`: `Pubkey` - The public key of the user to remove from the whitelist.
- `ManageWhitelist`: The context for managing the whitelist.

#### Usage

```rust
pub fn remove_from_whitelist(ctx: Context<ManageWhitelist>, user: Pubkey) -> Result<()> {
    remove_from_whitelist_(ctx, user)?;
    Ok(())
}
```

### Withdraw Lamports

Withdraws the accumulated lamports from token sales.

- `Withdraw`: The context for withdrawing lamports.

#### Usage

```rust
pub fn withdraw_lamports(ctx: Context<Withdraw>) -> Result<()> {
    withdraw_lamports_(ctx)?;
    Ok(())
}
```


## Client Interaction

To interact with the program from a client application, see `tests/` and `frontend/` folders.

## Tests

I have made a bunch of test cases, that checks different vulnerabilities, and also a lot of use cases for the program. I recommend to check them out.
```shell
$ anchor build
$ anchor test --provider.cluster=localnet
```

## Deployment

```shell
$ anchor deploy --provider.cluster=<YOUR_CLUSTER>
```

Ensure the program is deployed correctly by checking the logs.

## Blink
To run frontend UI:
```shell
$ cd frontend/
$ npm run dev
```
And go to http://localhost:3000/.