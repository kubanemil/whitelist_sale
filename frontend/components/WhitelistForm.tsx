import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { FC, useEffect, useState } from "react";
import styles from "../styles/Home.module.css";
import idl from "../idl.json";


export const WhitelistForm: FC = () => {
  const [txSig, setTxSig] = useState("");

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

  const link = () => {
    return txSig
      ? `https://explorer.solana.com/tx/${txSig}?cluster=devnet`
      : "";
  };

  const addWhitelist = async (event) => {
    event.preventDefault();
    if (!connection || !wallet) {
      return;
    }
    const dest = new anchor.web3.PublicKey(event.target.dest.value);
    console.log(`Adding ${amount} to whitelist`);

    const context = {
      authority: wallet.publicKey,
      whitelist: whitelistAddress,
    };

    // purchaseTokens()
    const txHash = await program
      .methods
      .addToWhitelist(dest)
      .accounts(context)
      .rpc();

    await provider.connection.confirmTransaction(txHash);
    console.log(`purchaseTokens() TX: https://explorer.solana.com/tx/${txHash}?cluster=devnet`);

    setTxSig(txHash);
  };

  if (!connection || !wallet) {
    return;
  } else {
    return (
      <div>
        <form onSubmit={addWhitelist} className={styles.form}>
          <label htmlFor="dest">Add to Whitelist:</label>
          <input
            id="dest"
            type="text"
            className={styles.formField}
            placeholder="Pubkey to add"
            required
          />
          <button type="submit" className={styles.formButton}>
            Add
          </button>
        </form>
        {txSig ? (
          <div>
            <p>Token Mint Address: {mintInfoAddress.toString()}</p>
            <p>View your transaction on </p>
            <a href={link()}>Solana Explorer</a>
          </div>
        ) : null}
      </div>
    );
  }

};
