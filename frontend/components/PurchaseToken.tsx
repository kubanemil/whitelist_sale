import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { FC, useEffect, useState } from "react";
import styles from "../styles/Home.module.css";
import idl from "../idl.json";


export const PurchaseToken: FC = () => {
  const [txSig, setTxSig] = useState("");
  const [tokenAmount, setTokenAmount] = useState(0);

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

  const purchaseToken = async (event) => {
    event.preventDefault();
    if (!connection || !wallet) {
      return;
    }
    const amount = Number(event.target.amount.value);

    const destination = await anchor.utils.token.associatedAddress({
      mint: mintInfoAddress,
      owner: wallet.publicKey,
    });

    const context = {
      payer: wallet.publicKey,
      destination,
      mint: mintInfoAddress,
      config: configAddress,
      whitelist: whitelistAddress,
    };

    // purchaseTokens()
    const txHash = await program.methods
      .purchaseTokens(new anchor.BN(amount))
      .accounts(context)
      .rpc();

    await provider.connection.confirmTransaction(txHash);
    console.log(`purchaseTokens() TX: https://explorer.solana.com/tx/${txHash}?cluster=devnet`);

    setTxSig(txHash);
  };

  useEffect(() => {
    if (!connection || !wallet) {
      return;
    }

    async function getTokenBalance() {
      try {
        const destination = await anchor.utils.token.associatedAddress({
          mint: mintInfoAddress,
          owner: wallet.publicKey,
        });

        const postTokenBalance = await provider.connection.getTokenAccountBalance(destination);
        setTokenAmount(Number(postTokenBalance.value.amount));
      } catch (error) {
        setTokenAmount(0);
      }
    }
    getTokenBalance();
  }, [connection, wallet]);

  if (!connection || !wallet) {
    return;
  } else {
    return (
      <div>
        <h6>EMIL token amount: {tokenAmount}</h6>
        <h6>1 EMIL costs 2 SOL</h6>
        <form onSubmit={purchaseToken} className={styles.form}>
          <label htmlFor="amount">Amount Tokens to Mint:</label>
          <input
            id="amount"
            type="text"
            className={styles.formField}
            placeholder="1"
            required
          />
          <button type="submit" className={styles.formButton}>
            Mint Tokens
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
