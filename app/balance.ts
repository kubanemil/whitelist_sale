import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";

// Configure the client to use the local cluster.
const connection = new Connection(clusterApiUrl("devnet"));

async function checkBalance(mint: PublicKey, owner: PublicKey) {
  // Get the associated token account address for the owner
  const tokenAccount = await getAssociatedTokenAddress(mint, owner);

  // Fetch the token account balance
  const accountInfo = await getAccount(connection, tokenAccount);
  const balance = accountInfo.amount;

  console.log(`Token account balance: ${balance}`);
}

// Replace these with your actual mint and owner public keys
const mintPublicKey = new PublicKey("8SgtTviRh89tu2nPNA7G8fNaGwhdjVgg7o4xpC9DSfaQ");
const ownerPublicKey = new PublicKey("4Jv119BxxYPKVSPztXdz2v7TFXBfyyshp1nPyeRJTPub");

// Check the balance
checkBalance(mintPublicKey, ownerPublicKey).then(() => {
  console.log("Balance check complete.");
}).catch(err => {
  console.error("Error checking balance:", err);
});
