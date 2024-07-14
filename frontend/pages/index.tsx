import { NextPage } from "next";
import styles from "../styles/Home.module.css";
import WalletContextProvider from "../components/WalletContextProvider";
import { AppBar } from "../components/AppBar";
import { BalanceDisplay } from "../components/BalanceDisplay";
import { WhitelistForm } from "../components/WhitelistForm";
import { PurchaseToken } from "../components/PurchaseToken";
import { InitiateTokenForm } from "../components/InitiateToken";
import Head from "next/head";

const Home: NextPage = (props) => {
  return (
    <div className={styles.App}>
      <Head>
        <title>Token Program</title>
        <meta name="description" content="Token Program" />
      </Head>
      <WalletContextProvider>
        <AppBar />
        <div className={styles.AppBody}>
          <BalanceDisplay />
          <InitiateTokenForm />
          <PurchaseToken />
          <WhitelistForm />
        </div>
      </WalletContextProvider>
    </div>
  );
};

export default Home;
