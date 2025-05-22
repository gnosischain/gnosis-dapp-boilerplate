'use client';

import React, { useState } from 'react';
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
  Divider,
  Space,
} from 'antd';
import Safe, {
  PredictedSafeProps,
  SafeAccountConfig,
  SafeTransactionDataPartial,
} from '@safe-global/protocol-kit';
import { createPublicClient, http, stringToHex } from 'viem';
import { gnosis } from 'viem/chains';
import { fetchSafesByOwner } from '@/lib/api';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import SafeProvider, { useSafeAppsSDK } from '@safe-global/safe-apps-react-sdk';
import { getSigner } from '@dynamic-labs/ethers-v6';
import { setUpRolesMod } from 'zodiac-roles-sdk';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Step } = Steps;

/** USDC token address on Gnosis Chain (mainnet). */
const GNOSIS_USDC_ADDRESS =
  '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83' as const;

/* -------------------------------------------------------------------------- */
/*                               helper utils                                 */
/* -------------------------------------------------------------------------- */

/** Pads/encodes a string to 32-byte bytes32. */
function toBytes32(value: string): `0x${string}` {
  return stringToHex(value, { size: 32 }) as `0x${string}`;
}

/* Addresses / constants for Zodiac-Roles SDK */
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const GNOSIS_CHAIN_ID = 100;

/* -------------------------------------------------------------------------- */
/*                           Inner component (logic)                          */
/* -------------------------------------------------------------------------- */
function SafeDeploymentInner() {
  /* ───────────── Existing state ───────────── */
  const [currentStep, setCurrentStep] = useState(0);
  const [ownersInput, setOwnersInput] = useState<string>('');
  const [thresholdInput, setThresholdInput] = useState<number>(2);
  const [signerKey, setSignerKey] = useState<string>('');

  const { primaryWallet } = useDynamicContext();
  const { sdk, connected } = useSafeAppsSDK(); // Safe Apps SDK (only inside Safe)

  const [protocolKit, setProtocolKit] = useState<Safe | null>(null);

  const [safeAddress, setSafeAddress] = useState<string>('');
  const [deploymentTx, setDeploymentTx] = useState<
    | { to: string; value: string; data: string }
    | null
  >(null);

  const [isDeployed, setIsDeployed] = useState<boolean>(false);
  const [deployedOwners, setDeployedOwners] = useState<string[]>([]);
  const [deployedThreshold, setDeployedThreshold] = useState<number>(0);

  const [walletAddress, setWalletAddress] = useState<string>('');
  const [safes, setSafes] = useState<string[]>([]);
  const [selectedSafe, setSelectedSafe] = useState<string>('');
  const [txTo, setTxTo] = useState<string>('');
  const [txValue, setTxValue] = useState<string>('');
  const [txData, setTxData] = useState<string>('0x');

  /* ───────────── NEW state for Roles flow ───────────── */
  const [roleKey, setRoleKey] = useState<string>('treasury-manager');
  const [roleMembersInput, setRoleMembersInput] = useState<string>('');
  const [usdcSpender, setUsdcSpender] = useState<string>('');
  const [rolesTxs, setRolesTxs] = useState<
    { to: string; value: string; data: string }[]
  >([]);
  /* ---------------------------------------------------- */

  const [loading, setLoading] = useState({
    init: false,
    predict: false,
    create: false,
    execute: false,
    reinit: false,
    fetch: false,
    rolesGen: false,
    rolesExec: false,
  });

  const steps = [
    { title: 'Configure Safe' },
    { title: 'Init Protocol Kit' },
    { title: 'Predict Address' },
    { title: 'Create Deployment Tx' },
    { title: 'Execute Transaction' },
    { title: 'Finalize & Verify' },
  ];

  const parseOwners = () =>
    ownersInput
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

  const parseRoleMembers = () =>
    roleMembersInput
      .split(',')
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

  /* ───────────── Deployment flow (Safe creation) ───────────── */
  async function handleInitKit() {
    if (!signerKey || parseOwners().length === 0 || thresholdInput < 1) {
      return notification.error({
        message: 'Invalid Configuration',
        description: 'Please fill in all fields correctly.',
      });
    }
    setLoading((l) => ({ ...l, init: true }));
    try {
      const safeAccountConfig: SafeAccountConfig = {
        owners: parseOwners(),
        threshold: thresholdInput,
      };

      const predictedSafe: PredictedSafeProps = {
        safeAccountConfig,
        safeDeploymentConfig: { saltNonce: Date.now().toString() },
      };

      const kit = await Safe.init({
        provider: gnosis.rpcUrls.default.http[0],
        signer: signerKey,
        predictedSafe,
      });

      setProtocolKit(kit);
      setCurrentStep(1);
      notification.success({ message: 'Protocol Kit initialized' });
    } catch (err: any) {
      notification.error({ message: 'Initialization failed', description: err.message });
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
      notification.info({ message: 'Predicted Safe address', description: address });
    } catch (err: any) {
      notification.error({ message: 'Prediction failed', description: err.message });
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
      notification.success({ message: 'Deployment transaction created' });
    } catch (err: any) {
      notification.error({ message: 'Creation failed', description: err.message });
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
        chain: gnosis,
      });

      await createPublicClient({
        chain: gnosis,
        transport: http(gnosis.rpcUrls.default.http[0]),
      }).waitForTransactionReceipt({ hash });

      setCurrentStep(4);
      notification.success({ message: 'Transaction executed', description: `Hash: ${hash}` });
    } catch (err: any) {
      notification.error({ message: 'Execution failed', description: err.message });
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
      notification.success({ message: 'Safe verified on-chain' });
    } catch (err: any) {
      notification.error({ message: 'Verification failed', description: err.message });
    } finally {
      setLoading((l) => ({ ...l, reinit: false }));
    }
  }

  /* ───────────── Existing Safe helpers ───────────── */
  async function handleFetchSafes() {
    if (!walletAddress && !primaryWallet) {
      return notification.error({
        message: 'Missing Wallet',
        description: 'Please enter a wallet address or connect a wallet.',
      });
    }
    setLoading((l) => ({ ...l, fetch: true }));
    try {
      const address = walletAddress || primaryWallet?.address;
      if (!address) throw new Error('No wallet address provided');
      const fetched = await fetchSafesByOwner(address);
      setSafes(fetched);
    } catch (err: any) {
      notification.error({ message: 'Fetch failed', description: err.message });
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
        value: BigInt(txValue || '0'),
        data: txData as `0x${string}`,
        chain: gnosis,
      });

      await createPublicClient({
        chain: gnosis,
        transport: http(gnosis.rpcUrls.default.http[0]),
      }).waitForTransactionReceipt({ hash });

      notification.success({ message: 'Safe transaction executed', description: `Hash: ${hash}` });
    } catch (err: any) {
      notification.error({ message: 'Execution failed', description: err.message });
    } finally {
      setLoading((l) => ({ ...l, execute: false }));
    }
  }

  /* ───────────── Zodiac Roles flow ───────────── */
  async function handleGenerateRolesTxs() {
    if (!selectedSafe) {
      return notification.error({
        message: 'No Safe selected',
        description: 'Select a Safe from the list first.',
      });
    }
    if (!usdcSpender || parseRoleMembers().length === 0) {
      return notification.error({
        message: 'Incomplete Role data',
        description: 'Add at least one member and the USDC spender address.',
      });
    }

    setLoading((l) => ({ ...l, rolesGen: true }));
    try {
      const roles = [
        {
          key: toBytes32(roleKey), // 32-byte identifier
          members: parseRoleMembers() as `0x${string}`[],
          permissions: [
            {
              targetAddress: GNOSIS_USDC_ADDRESS,
              signature: 'approve(address,uint256)',
            },
            {
              targetAddress: GNOSIS_USDC_ADDRESS,
              signature: 'transfer(address,uint256)',
            },
          ],
        },
      ];

      const txs = setUpRolesMod({
        avatar: selectedSafe as `0x${string}`,
        target: selectedSafe as `0x${string}`,
        owner: selectedSafe as `0x${string}`,
        roles,
        enableOnTarget: true,
        // 🆕 make network explicit & bypass undeployed helper
        chainId: GNOSIS_CHAIN_ID,
        safeWebAuthnSignerFactory: ZERO_ADDRESS,
      });

      setRolesTxs(txs);
      notification.success({
        message: 'Generated Roles-module transactions',
        description: `Count: ${txs.length}`,
      });
    } catch (err: any) {
      notification.error({ message: 'Roles generation failed', description: err.message });
    } finally {
      setLoading((l) => ({ ...l, rolesGen: false }));
    }
  }

  /**
   * Execute the previously-generated Roles-module transactions.
   *
   * • Inside Safe UI → batch-send via Safe Apps SDK.
   * • Outside UI → create & execute a Safe multi-send directly on-chain.
   */
  async function handleExecuteRolesTxs() {
    if (rolesTxs.length === 0) {
      return notification.error({
        message: 'No transactions to execute',
        description: 'Generate Roles transactions first.',
      });
    }

    setLoading((l) => ({ ...l, rolesExec: true }));
    try {
      /* ───── Path 1 — inside Safe UI ───── */
      if (connected) {
        const result = await sdk.txs.send({
          txs: rolesTxs.map((tx) => ({
            to: tx.to,
            value: tx.value,
            data: tx.data,
          })),
        });

        notification.success({
          message: 'Roles module setup initiated!',
          description: `Safe Tx hash: ${result.safeTxHash}`,
        });
      } else {
        /* ───── Path 2 — outside Safe UI ───── */
        if (!primaryWallet)
          throw new Error('No connected wallet found for direct Safe execution.');

        const signer = await getSigner(primaryWallet, true);

        const kit = await Safe.init({
          provider: gnosis.rpcUrls.default.http[0],
          signer,
          safeAddress: selectedSafe,
        });

        const safeTx = await kit.createTransaction({
          safeTransactionData: rolesTxs as SafeTransactionDataPartial[],
        });

        const txHash = await kit.getTransactionHash(safeTx);
        await kit.signTransactionHash(txHash);
        const executeTxResponse = await kit.executeTransaction(safeTx);

        notification.success({
          message: 'Roles module setup executed',
          description: `Safe Tx hash: ${executeTxResponse.hash}`,
        });
      }

      setRolesTxs([]);
    } catch (err: any) {
      notification.error({
        message: 'Roles execution failed',
        description: err.message || 'Unknown error occurred',
      });
    } finally {
      setLoading((l) => ({ ...l, rolesExec: false }));
    }
  }

  const rolesExecDisabled =
    rolesTxs.length === 0 || (!connected && !primaryWallet);

  return (
    <Layout>
      <Header
        style={{
          background: '#fff',
          width: '100%',
          padding: '16px 0',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Title
          level={3}
          style={{ margin: 0, fontFamily: 'Poppins, sans-serif', textAlign: 'center' }}
        >
          Safe Deployment (Gnosis Mainnet)
        </Title>
      </Header>

      <Content style={{ padding: '25px 50px' }}>
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          {steps.map((item) => (
            <Step key={item.title} title={item.title} />
          ))}
        </Steps>

        {/* New-Safe flow */}
        <div className="steps-content">
          {currentStep === 0 && (
            <Form layout="vertical">
              <Form.Item label="Owners (comma separated)">
                <Input
                  value={ownersInput}
                  onChange={(e) => setOwnersInput(e.target.value)}
                />
              </Form.Item>
              <Form.Item label="Threshold">
                <InputNumber
                  min={1}
                  value={thresholdInput}
                  onChange={(v) => setThresholdInput(v ?? 1)}
                />
              </Form.Item>
              <Form.Item label="Signer Private Key">
                <Input.Password
                  value={signerKey}
                  onChange={(e) => setSignerKey(e.target.value)}
                />
              </Form.Item>
              <Button
                type="primary"
                onClick={handleInitKit}
                loading={loading.init}
              >
                Initialize Protocol Kit
              </Button>
            </Form>
          )}

          {currentStep === 1 && (
            <Button
              type="primary"
              onClick={handlePredict}
              loading={loading.predict}
            >
              Predict Safe Address
            </Button>
          )}

          {currentStep === 2 && (
            <Button
              type="primary"
              onClick={handleCreateTx}
              loading={loading.create}
            >
              Create Deployment Transaction
            </Button>
          )}

          {currentStep === 3 && (
            <Button
              type="primary"
              onClick={handleExecute}
              loading={loading.execute}
            >
              Execute Transaction
            </Button>
          )}

          {currentStep === 4 && (
            <Button
              type="primary"
              onClick={handleReinitialize}
              loading={loading.reinit}
            >
              Finalize & Verify
            </Button>
          )}

          {currentStep === 5 && (
            <div>
              <Text strong>Safe Address:</Text>{' '}
              <Text copyable>{safeAddress}</Text>
              <br />
              <Text strong>Deployed:</Text> {isDeployed ? '✅' : '❌'}
              <br />
              <Text strong>Owners:</Text> {deployedOwners.join(', ')}
              <br />
              <Text strong>Threshold:</Text> {deployedThreshold}
            </div>
          )}
        </div>

        {/* Existing Safes */}
        <Divider style={{ marginTop: 64 }} />
        <Title level={3}>Manage Existing Safes</Title>

        <Form layout="vertical">
          <Form.Item label="Wallet Address">
            <Input
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
            />
          </Form.Item>
          <Button
            type="primary"
            onClick={handleFetchSafes}
            loading={loading.fetch}
          >
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
                <Button
                  key="select"
                  type="link"
                  onClick={() => setSelectedSafe(safe)}
                >
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
            {/* Basic TX UI */}
            <Title level={4} style={{ marginTop: 32 }}>
              New Transaction for {selectedSafe.slice(0, 10)}…
            </Title>
            <Form layout="vertical">
              <Form.Item label="To">
                <Input
                  value={txTo}
                  onChange={(e) => setTxTo(e.target.value)}
                />
              </Form.Item>
              <Form.Item label="Value (wei)">
                <Input
                  value={txValue}
                  onChange={(e) => setTxValue(e.target.value)}
                />
              </Form.Item>
              <Form.Item label="Data (hex)">
                <Input
                  value={txData}
                  onChange={(e) => setTxData(e.target.value)}
                />
              </Form.Item>
              <Button
                type="primary"
                onClick={handleExecuteSafeTx}
                loading={loading.execute}
              >
                Execute Safe Transaction
              </Button>
            </Form>

            {/* Zodiac Roles UI */}
            <Divider style={{ marginTop: 48 }} />
            <Title level={4}>Set up Zodiac Roles Module</Title>
            <Form layout="vertical">
              <Form.Item label="Role key (identifier)">
                <Input
                  value={roleKey}
                  onChange={(e) => setRoleKey(e.target.value)}
                />
              </Form.Item>
              <Form.Item label="Role members (comma separated)">
                <Input
                  value={roleMembersInput}
                  onChange={(e) => setRoleMembersInput(e.target.value)}
                />
              </Form.Item>
              <Form.Item label="USDC spender (for approve permission)">
                <Input
                  value={usdcSpender}
                  onChange={(e) => setUsdcSpender(e.target.value)}
                />
              </Form.Item>

              <Space>
                <Button
                  onClick={handleGenerateRolesTxs}
                  loading={loading.rolesGen}
                >
                  Generate Roles Tx(s)
                </Button>
                <Button
                  type="primary"
                  disabled={rolesExecDisabled}
                  onClick={handleExecuteRolesTxs}
                  loading={loading.rolesExec}
                >
                  Execute Roles Tx(s)
                </Button>
              </Space>
            </Form>

            {rolesTxs.length > 0 && (
              <Text type="secondary">
                {rolesTxs.length} transaction(s) ready – click &quot;Execute&quot; to send them.
              </Text>
            )}

            {!connected && (
              <Text type="warning">
                Running outside the Safe interface – transactions will be sent
                via the Safe contract directly using your connected wallet.
              </Text>
            )}
          </>
        )}
      </Content>
    </Layout>
  );
}

/* -------------------------------------------------------------------------- */
/*                           Wrapper with SafeProvider                        */
/* -------------------------------------------------------------------------- */
export default function SafeDeployment() {
  return (
    <SafeProvider loader={null}>
      <SafeDeploymentInner />
    </SafeProvider>
  );
}
