import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { WhitelistSale } from "../target/types/whitelist_sale";

// Configure the client to use the local cluster.
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.WhitelistSale as anchor.Program<WhitelistSale>;

interface MintTokensContext {
  mint: PublicKey;
  destination: PublicKey;
  payer: PublicKey;
  rent: PublicKey;
  systemProgram: PublicKey;
  tokenProgram: PublicKey;
  associatedTokenProgram: PublicKey;
}

async function mintTokens(quantity: number) {
  const mintKey = new PublicKey("8SgtTviRh89tu2nPNA7G8fNaGwhdjVgg7o4xpC9DSfaQ");
  const payerKey = provider.wallet.publicKey;
  const destination = await anchor.utils.token.associatedAddress({
    mint: mintKey,
    owner: payerKey,
  });

  const [mintPda, mintBump] = await PublicKey.findProgramAddressSync(
    [Buffer.from("mint")],
    program.programId
  );

  const context: MintTokensContext = {
    mint: mintPda,
    destination,
    payer: payerKey,
    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    systemProgram: SystemProgram.programId,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  };

  await program.methods
    .mintTokens(new anchor.BN(quantity))
    .accounts(context)
    .signers([])
    .rpc();
}

// Call the function to mint tokens
mintTokens(100).then(() => {
  console.log("Tokens minted successfully.");
}).catch(err => {
  console.error("Error minting tokens:", err);
});


