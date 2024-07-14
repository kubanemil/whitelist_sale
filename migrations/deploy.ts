// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.


import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { WhitelistSale } from "../target/types/whitelist_sale";
import { assert, expect } from "chai";

const MINT_SEED = "mint";
const WHITELIST_SEED = "whitelist";
const METADATA_SEED = "metadata";
const CONFIG_SEED = "config";
const MPL_TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const DECIMALS = 9;

module.exports = async function (provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  const program = anchor.workspace.WhitelistSale as Program<WhitelistSale>;
  const payer = provider.wallet.publicKey;
  anchor.setProvider(provider);

  const [mintInfoAddress] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(MINT_SEED)],
    program.programId
  );

  const metadata = {
    name: "My Emil Token",
    symbol: "EMIL",
    uri: "https://turquoise-used-shark-708.mypinata.cloud/ipfs/QmbW8HunnGGccHBCfWvchb7GMWwwPqmAtxnu4Hw7JAvJpc",
    decimals: DECIMALS,
  };

  const [metadataAddress] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_SEED),
      MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mintInfoAddress.toBuffer(),
    ],
    MPL_TOKEN_METADATA_PROGRAM_ID
  );

  const [whitelistAddress] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(WHITELIST_SEED)],
    program.programId
  );

  const [configAddress] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(CONFIG_SEED)],
    program.programId
  );

  const info = await provider.connection.getAccountInfo(mintInfoAddress);
  if (info) {
    console.log("Already initialized. Skipping initialization.");
    return;
  }

  const context = {
    payer,
    mint: mintInfoAddress,
    whitelist: whitelistAddress,
    metadata: metadataAddress,
    config: configAddress,
    mplTokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
  };

  // call initToken()
  const txHash = await program.methods.initToken(metadata).accounts(context).rpc();

  await provider.connection.confirmTransaction(txHash, 'finalized');
  console.log(`initToken() TX:  https://explorer.solana.com/tx/${txHash}?cluster=custom`);

  const newInfo = await provider.connection.getAccountInfo(mintInfoAddress);
  assert(newInfo, "Mint should be initialized.");
};
