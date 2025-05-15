"use client";

import React, { useState } from "react";
import {
  Layout,
  Steps,
  Form,
  Input,
  InputNumber,
  Button,
  Typography,
  List,
  notification,
} from "antd";
import Safe, {
  PredictedSafeProps,
  SafeAccountConfig,
} from "@safe-global/protocol-kit";
import { createPublicClient, http } from "viem";
import { gnosisChiado } from "viem/chains";

import { fetchSafesByOwner } from "@/lib/api";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Step } = Steps;

export default function SafeDeployment() {
  /* ---------------------------- State management --------------------------- */
  const [currentStep, setCurrentStep] = useState(0);

  // Inputs for new Safe deployment
  const [ownersInput, setOwnersInput] = useState<string>("");
  const [thresholdInput, setThresholdInput] = useState<number>(2);
  const [signerKey, setSignerKey] = useState<string>("");

  // Wallet context (MUST be at the top level – hooks can’t be nested)
  const { primaryWallet } = useDynamicContext();

  // Protocol kit instance
  const [protocolKit, setProtocolKit] = useState<any>(null);

  // Deployment info
  const [saltNonce, setSaltNonce] = useState<string>("");
  const [safeAddress, setSafeAddress] = useState<string>("");
  const [deploymentTx, setDeploymentTx] = useState<
    | {
        to: string;
        value: string;
        data: string;
      }
    | null
  >(null);

  // Execution
  const [txHash, setTxHash] = useState<string>("");
  const [txReceipt, setTxReceipt] = useState<any>(null);

  // Verification
  const [isDeployed, setIsDeployed] = useState<boolean>(false);
  const [deployedOwners, setDeployedOwners] = useState<string[]>([]);
  const [deployedThreshold, setDeployedThreshold] = useState<number>(0);

  // Manage existing safes
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [safes, setSafes] = useState<string[]>([]);
  const [selectedSafe, setSelectedSafe] = useState<string>("");
  const [txTo, setTxTo] = useState<string>("");
  const [txValue, setTxValue] = useState<string>("");
  const [txData, setTxData] = useState<string>("0x");

  // Loading states
  const [loading, setLoading] = useState({
    init: false,
    predict: false,
    create: false,
    execute: false,
    reinit: false,
    fetch: false,
  });

  /* --------------------------------- Steps -------------------------------- */
  const steps = [
    { title: "Configure Safe" },
    { title: "Init Protocol Kit" },
    { title: "Predict Address" },
    { title: "Create Deployment Tx" },
    { title: "Execute Transaction" },
    { title: "Finalize & Verify" },
  ];

  /* ------------------------------ Helpers --------------------------------- */
  const parseOwners = () =>
    ownersInput
      .split(",")
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

  /* --------------------------- Deployment flow ---------------------------- */
  async function handleInitKit() {
    if (!signerKey || parseOwners().length === 0 || thresholdInput < 1) {
      return notification.error({
        message: "Invalid Configuration",
        description: "Please fill in all fields correctly.",
      });
    }

    setLoading((l) => ({ ...l, init: true }));

    try {
      // saltNonce must be a string
      const uniqueSalt = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
      setSaltNonce(uniqueSalt);

      const safeAccountConfig: SafeAccountConfig = {
        owners: parseOwners(),
        threshold: thresholdInput,
      };

      const predictedSafe: PredictedSafeProps = {
        safeAccountConfig,
        safeDeploymentConfig: {
          saltNonce: uniqueSalt,
        },
      };

      const kit = await Safe.init({
        provider: gnosisChiado.rpcUrls.default.http[0],
        signer: signerKey,
        predictedSafe,
      });

      setProtocolKit(kit);
      setCurrentStep(1);
      notification.success({ message: "Protocol Kit initialized" });
    } catch (err: any) {
      notification.error({ message: "Initialization failed", description: err.message });
    } finally {
      setLoading((l) => ({ ...l, init: false }));
    }
  }

  async function handlePredict() {
    if (!protocolKit) return;
    setLoading((l) => ({ ...l, predict: true }));
    try {
      const address = await protocolKit.getAddress();
      setSafeAddress(address);
      setCurrentStep(2);
      notification.info({ message: "Predicted Safe address", description: address });
    } catch (err: any) {
      notification.error({ message: "Prediction failed", description: err.message });
    } finally {
      setLoading((l) => ({ ...l, predict: false }));
    }
  }

  async function handleCreateTx() {
    if (!protocolKit) return;
    setLoading((l) => ({ ...l, create: true }));
    try {
      const tx = await protocolKit.createSafeDeploymentTransaction();
      setDeploymentTx(tx);
      setCurrentStep(3);
      notification.success({ message: "Deployment transaction created" });
    } catch (err: any) {
      notification.error({ message: "Creation failed", description: err.message });
    } finally {
      setLoading((l) => ({ ...l, create: false }));
    }
  }

  async function handleExecute() {
    if (!protocolKit || !deploymentTx) return;
    setLoading((l) => ({ ...l, execute: true }));
    try {
      const signer = await protocolKit.getSafeProvider().getExternalSigner();
      const hash = await signer.sendTransaction({
        to: deploymentTx.to,
        value: BigInt(deploymentTx.value),
        data: deploymentTx.data as `0x${string}`,
        chain: gnosisChiado,
      });
      setTxHash(hash);

      const client = createPublicClient({
        chain: gnosisChiado,
        transport: http(gnosisChiado.rpcUrls.default.http[0]),
      });
      const receipt = await client.waitForTransactionReceipt({ hash });
      setTxReceipt(receipt);

      setCurrentStep(4);
      notification.success({ message: "Transaction executed", description: `Hash: ${hash}` });
    } catch (err: any) {
      notification.error({ message: "Execution failed", description: err.message });
    } finally {
      setLoading((l) => ({ ...l, execute: false }));
    }
  }

  async function handleReinitialize() {
    if (!protocolKit || !safeAddress) return;
    setLoading((l) => ({ ...l, reinit: true }));
    try {
      const kit = await protocolKit.connect({ safeAddress });
      setProtocolKit(kit);

      const deployed = await kit.isSafeDeployed();
      const owners = await kit.getOwners();
      const thresh = await kit.getThreshold();

      setIsDeployed(deployed);
      setDeployedOwners(owners);
      setDeployedThreshold(thresh);
      setCurrentStep(5);
      notification.success({ message: "Safe verified on-chain" });
    } catch (err: any) {
      notification.error({ message: "Verification failed", description: err.message });
    } finally {
      setLoading((l) => ({ ...l, reinit: false }));
    }
  }

  /* -------------------------- Existing Safe Flow -------------------------- */
  async function handleFetchSafes() {
    if (!walletAddress && !primaryWallet) {
      return notification.error({
        message: "Missing Wallet",
        description: "Please enter a wallet address or connect a wallet.",
      });
    }

    setLoading((l) => ({ ...l, fetch: true }));
    try {
      const address = walletAddress || primaryWallet?.address;
      if (!address) throw new Error("No wallet address provided");

      const fetched = await fetchSafesByOwner(address);
      setSafes(fetched);
    } catch (err: any) {
      notification.error({ message: "Fetch failed", description: err.message });
    } finally {
      setLoading((l) => ({ ...l, fetch: false }));
    }
  }

  async function handleExecuteSafeTx() {
    if (!protocolKit || !selectedSafe) return;
    setLoading((l) => ({ ...l, execute: true }));
    try {
      const kitConnected = await protocolKit.connect({ safeAddress: selectedSafe });
      setProtocolKit(kitConnected);

      const signer = await kitConnected.getSafeProvider().getExternalSigner();
      const hash = await signer.sendTransaction({
        to: txTo,
        value: BigInt(txValue || "0"),
        data: txData as `0x${string}`,
        chain: gnosisChiado,
      });
      setTxHash(hash);

      const client = createPublicClient({
        chain: gnosisChiado,
        transport: http(gnosisChiado.rpcUrls.default.http[0]),
      });
      const receipt = await client.waitForTransactionReceipt({ hash });
      setTxReceipt(receipt);

      notification.success({ message: "Safe transaction executed", description: `Hash: ${hash}` });
    } catch (err: any) {
      notification.error({ message: "Execution failed", description: err.message });
    } finally {
      setLoading((l) => ({ ...l, execute: false }));
    }
  }

  return (
    <Layout>
      <Header>
        <Title level={2}>Safe Deployment</Title>
      </Header>
      <Content style={{ padding: "0 50px" }}>
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          {steps.map((item) => (
            <Step key={item.title} title={item.title} />
          ))}
        </Steps>

        {/* ----- New-Safe flow ----- */}
        <div className="steps-content">
          {currentStep === 0 && (
            <Form layout="vertical">
              <Form.Item label="Owners (comma separated)">
                <Input value={ownersInput} onChange={(e) => setOwnersInput(e.target.value)} />
              </Form.Item>
              <Form.Item label="Threshold">
                <InputNumber min={1} value={thresholdInput} onChange={(value) => setThresholdInput(value ?? 1)} />
              </Form.Item>
              <Form.Item label="Signer Private Key">
                <Input.Password value={signerKey} onChange={(e) => setSignerKey(e.target.value)} />
              </Form.Item>
              <Button type="primary" onClick={handleInitKit} loading={loading.init}>
                Initialize Protocol Kit
              </Button>
            </Form>
          )}

          {currentStep === 1 && (
            <Button type="primary" onClick={handlePredict} loading={loading.predict}>
              Predict Safe Address
            </Button>
          )}

          {currentStep === 2 && (
            <Button type="primary" onClick={handleCreateTx} loading={loading.create}>
              Create Deployment Transaction
            </Button>
          )}

          {currentStep === 3 && (
            <Button type="primary" onClick={handleExecute} loading={loading.execute}>
              Execute Transaction
            </Button>
          )}

          {currentStep === 4 && (
            <Button type="primary" onClick={handleReinitialize} loading={loading.reinit}>
              Finalize & Verify
            </Button>
          )}

          {currentStep === 5 && (
            <div>
              <Text strong>Safe Address:</Text> <Text copyable>{safeAddress}</Text>
              <br />
              <Text strong>Deployed:</Text> {isDeployed ? "✅" : "❌"}
              <br />
              <Text strong>Owners:</Text> {deployedOwners.join(", ")}
              <br />
              <Text strong>Threshold:</Text> {deployedThreshold}
            </div>
          )}
        </div>

        {/* ----- Existing Safes ----- */}
        <div className="existing-safe" style={{ marginTop: 64 }}>
          <Title level={3}>Manage Existing Safes</Title>

          <Form layout="vertical">
            <Form.Item label="Wallet Address">
              <Input value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} />
            </Form.Item>
            <Button type="primary" onClick={handleFetchSafes} loading={loading.fetch}>
              Fetch Safes
            </Button>
          </Form>

          <List
            bordered
            dataSource={safes}
            style={{ marginTop: 16 }}
            renderItem={(safe) => (
              <List.Item
                actions={[
                  <Button key="select" type="link" onClick={() => setSelectedSafe(safe)}>
                    Select
                  </Button>,
                ]}
              >
                <Text copyable>{safe}</Text>
              </List.Item>
            )}
          />

          {selectedSafe && (
            <>
              <Title level={4} style={{ marginTop: 32 }}>
                New Transaction for {selectedSafe.slice(0, 10)}…
              </Title>
              <Form layout="vertical">
                <Form.Item label="To">
                  <Input value={txTo} onChange={(e) => setTxTo(e.target.value)} />
                </Form.Item>
                <Form.Item label="Value (wei)">
                  <Input value={txValue} onChange={(e) => setTxValue(e.target.value)} />
                </Form.Item>
                <Form.Item label="Data (hex)">
                  <Input value={txData} onChange={(e) => setTxData(e.target.value)} />
                </Form.Item>
                <Button type="primary" onClick={handleExecuteSafeTx} loading={loading.execute}>
                  Execute Safe Transaction
                </Button>
              </Form>
            </>
          )}
        </div>
      </Content>
    </Layout>
  );
}
