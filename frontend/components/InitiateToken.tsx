import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { FC, useState } from "react";
import styles from "../styles/Home.module.css";
import idl from "../idl.json";


export const InitiateTokenForm: FC = () => {
  const [txSig, setTxSig] = useState("");
  const [mint, setMint] = useState("");

  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const provider = new anchor.AnchorProvider(connection, wallet, {})
  anchor.setProvider(provider);

  const programId = new anchor.web3.PublicKey("8KeThqsiCyHR7Uez2W2RZFKAxqYWVR2PqU4akDmAWHjT");
  const program = new anchor.Program(idl as anchor.Idl, programId);


  const [mintInfoAddress] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("mint")],
    program.programId
);

const [whitelistAddress] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("whitelist")],
    program.programId
);

const [configAddress] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
);

const metadata = {
    name: "My Emil Token",
    symbol: "EMIL",
    uri: "https://turquoise-used-shark-708.mypinata.cloud/ipfs/QmbW8HunnGGccHBCfWvchb7GMWwwPqmAtxnu4Hw7JAvJpc",
    decimals: 9,
};

const MPL_TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const [metadataAddress] = anchor.web3.PublicKey.findProgramAddressSync(
    [
        Buffer.from("metadata"),
        MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintInfoAddress.toBuffer(),
    ],
    MPL_TOKEN_METADATA_PROGRAM_ID
);

  const link = () => {
    return txSig
      ? `https://explorer.solana.com/tx/${txSig}?cluster=devnet`
      : "";
  };

  const initiateToken = async (event) => {
    event.preventDefault();
    if (!connection || !wallet) {
      return;
    }

    const context = {
      payer: wallet.publicKey,
      mint: mintInfoAddress,
      whitelist: whitelistAddress,
      metadata: metadataAddress,
      config: configAddress,
      mplTokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
  };

  // call initToken()
  const txHash = await program.methods.initToken(metadata).accounts(context).rpc();

  await provider.connection.confirmTransaction(txHash, 'finalized');
  console.log(`initToken() TX:  https://explorer.solana.com/tx/${txHash}?cluster=devnet`);
  setTxSig(txHash);

  };

  if (!connection || !wallet) {
    return;
  } else {
    return (
      <div>
        {wallet.publicKey ? (
          <form onSubmit={initiateToken} className={styles.form}>
            <button type="submit" className={styles.formButton}>
              Initiate Token
            </button>
          </form>
        ) : (
          <span>Connect Your Wallet</span>
        )}
        {txSig ? (
          <div>
            <p>Token Mint Address: {mintInfoAddress}</p>
            <p>View your transaction on </p>
            <a href={link()}>Solana Explorer</a>
          </div>
        ) : null}
      </div>
    );
  }
  
};
