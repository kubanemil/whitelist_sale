import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { WhitelistSale } from "../target/types/whitelist_sale";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo } from "@solana/spl-token";
import { assert } from "chai";

/* If testing with a local cluster, deploy Metaplex Metadata program with:
$ solana-test-validator -r --bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s metadata.so
And skip local validator setup when running the tests:
$ anchor test --skip-local-validator
*/
describe("whitelist_sale", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);


  const program = anchor.workspace.WhitelistSale as Program<WhitelistSale>;
  const config = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);

  const METADATA_SEED = "metadata";
  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  const MINT_SEED = "mint";

  // Data for our tests
  const payer = provider.wallet.publicKey;
  const metadata = {
    name: "My Shrek Token",
    symbol: "SHREK",
    uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS92cMXfUwQSMFMcS-U9JrsKK5XNJMw-P-Sus1MuxmWVHVJ03AC-DtMc-betZYjA6UaD7O-fmJ6MrXj4urZStnTHZr_r6q7BMC4hYDA6IE",
    decimals: 9,
  };
  const mintAmount = 10;
  const [mint] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(MINT_SEED)],
    program.programId
  );

  const [metadataAddress] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_SEED),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );


  it("Is initialized!", async () => {
    const info = await provider.connection.getAccountInfo(mint);
    if (info) {
      return; // Do not attempt to initialize if already initialized
    }
    console.log("  Mint not found. Attempting to initialize.");

    const context = {
      metadata: metadataAddress,
      mint,
      payer,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    };

    const txHash = await program.methods
      .initToken(metadata)
      .accounts(context)
      .rpc();

    await provider.connection.confirmTransaction(txHash, 'finalized');
    console.log(`  https://explorer.solana.com/tx/${txHash}?cluster=custom`);
    const newInfo = await provider.connection.getAccountInfo(mint);

    assert(newInfo, "  Mint should be initialized.");
  });

  it("mint tokens", async () => {

    const destination = await anchor.utils.token.associatedAddress({
      mint: mint,
      owner: payer,
    });

    let initialBalance: number;
    try {
      const balance = (await provider.connection.getTokenAccountBalance(destination))
      initialBalance = balance.value.uiAmount;
    } catch {
      // Token account not yet initiated has 0 balance
      initialBalance = 0;
    }

    const context = {
      mint,
      destination,
      payer,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
    };

    const txHash = await program.methods
      .mintTokens(new BN(mintAmount * 10 ** metadata.decimals))
      .accounts(context)
      .rpc();
    await provider.connection.confirmTransaction(txHash);
    console.log(`  https://explorer.solana.com/tx/${txHash}?cluster=custom`);

    const postBalance = (
      await provider.connection.getTokenAccountBalance(destination)
    ).value.uiAmount;
    assert.equal(
      initialBalance + mintAmount,
      postBalance,
      "Post balance should equal initial plus mint amount"
    );
  });

  it("mint tokens directly using SPL Token program", async () => {

    let otherPayer = anchor.web3.Keypair.generate();
    await airdrop(otherPayer.publicKey, provider);
    
    // Create a new mint
    const newMint = await createMint(
      provider.connection,
      otherPayer,
      otherPayer.publicKey, // Mint authority
      null, // Freeze authority (optional)
      metadata.decimals, // Decimals
    );

    // Create a token account for the payer
    const payerTokenAccount = await createAccount(
      provider.connection,
      otherPayer, // Fee payer
      newMint, // Mint
      otherPayer.publicKey, // Owner of the account
    );

    // Mint tokens to the token account
    await mintTo(
      provider.connection,
      otherPayer,
      newMint, // Mint
      payerTokenAccount, // Destination token account
      otherPayer.publicKey, // Mint authority
      mintAmount * 10 ** metadata.decimals, // Amount to mint
      [], // Signers (optional)
    );

    // Verify the balance of the token account
    const balance = await provider.connection.getTokenAccountBalance(payerTokenAccount);
    const tokenBalance = balance.value.uiAmount;

    assert.equal(tokenBalance, mintAmount, "Token account balance should be equal to mint amount");
    console.log(`  Token account balance: ${tokenBalance}`);
  });
});


async function airdrop(airdropAddress: anchor.web3.PublicKey, provider: anchor.Provider ) {
  const airdropAmount = 10;

  // Request airdrop
  await provider.connection.confirmTransaction(
    await provider.connection.requestAirdrop(airdropAddress, airdropAmount * 10 ** 9),
    "confirmed"
  );

  // Check balance after airdrop
  const AirBalance = await provider.connection.getBalance(airdropAddress);
  console.log(`  Airdrop successful! New balance: ${AirBalance / 10 ** 9} SOL`);
}