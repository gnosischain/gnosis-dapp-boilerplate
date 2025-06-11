'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Typography,
  message,
  Switch,
  Space,
  Divider,
  Descriptions,
  Tooltip,
  Avatar,
  Progress,
} from 'antd';
import { WalletOutlined } from '@ant-design/icons';
import { parseEther } from 'viem';

interface ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
}
interface ProviderDetail {
  info: ProviderInfo;
  provider: any; // EIP-1193
}
declare global {
  interface Window {
    ethereum?: any;
  }
}
const CHAINLIST_INFO_API =
  'https://raw.githubusercontent.com/ethereum-lists/chains/master/_data/chains.json';
const toHex = (n: number) => '0x' + n.toString(16);
const POLL_INTERVAL = 1500; // ms

const { Title, Text } = Typography;

export default function EIP5792Demo() {
  /* ---------- hydration guard (FIRST, keeps hook order stable) ------ */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* ---------------- provider / account state ----------------------- */
  const [providers, setProviders] = useState<ProviderDetail[]>([]);
  const [provider, setProvider] = useState<any | null>(null);
  const [account, setAccount] = useState<string>();
  const [chainId, setChainId] = useState<number>();
  const [explorerBase, setExplorerBase] = useState('https://gnosisscan.io/');

  /* ---------------- capability / 5792 state ------------------------ */
  const [caps, setCaps] = useState<any | null>(null);

  /* ---------------- batch-tx helper state -------------------------- */
  const [paymaster, setPaymaster] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  /* ---------- discover and register providers ---------- */
  useEffect(() => {
    const handler = (e: any) => {
      const detail: ProviderDetail = e.detail;
      setProviders(prev =>
        prev.some(x => x.info.uuid === detail.info.uuid) ? prev : [...prev, detail]
      );
    };
    window.addEventListener('eip6963:announceProvider', handler);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    if (window.ethereum) {
      setProviders(prev =>
        prev.some(x => x.provider === window.ethereum)
          ? prev
          : [
              ...prev,
              {
                info: {
                  uuid: 'default',
                  name: 'MetaMask',
                  icon:
                    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PC9zdmc+',
                },
                provider: window.ethereum,
              },
            ]
      );
    }
    return () => window.removeEventListener('eip6963:announceProvider', handler);
  }, []);

  const connect = async (pd: ProviderDetail) => {
    try {
      const accounts: string[] = await pd.provider.request({ method: 'eth_requestAccounts' });
      const cidHex: string = await pd.provider.request({ method: 'eth_chainId' });

      setProvider(pd.provider);
      setAccount(accounts[0]);
      setChainId(Number(cidHex));

      /* explorer base */
      try {
        const rows: any[] = await (await fetch(CHAINLIST_INFO_API)).json();
        const info = rows.find(c => c.chainId === Number(cidHex));
        setExplorerBase(info?.explorers?.[0]?.url || 'https://gnosisscan.io/');
      } catch {
        setExplorerBase('https://gnosisscan.io/');
      }

      setCaps(null);
      setLastTxHash(null);
      setPaymaster(false);

      pd.provider.on('accountsChanged', (accounts: string[]) => {
        setAccount(accounts[0]);
        setCaps(null);
        setLastTxHash(null);
      });
      pd.provider.on('chainChanged', (hex: string) => {
        setChainId(Number(hex));
        setCaps(null);
        setLastTxHash(null);
      });

      message.success(`Connected: ${pd.info.name}`);
    } catch (err: any) {
      message.error(`Connect failed: ${err.message}`);
    }
  };

  const disconnect = () => {
    setProvider(null);
    setAccount(undefined);
    setChainId(undefined);
    setCaps(null);
    setLastTxHash(null);
    setPendingId(null);
    setPaymaster(false);
    message.info('Disconnected.');
  };

  const hasProvider = () => {
    if (!provider || !account) {
      message.error('Please connect a wallet first.');
      return false;
    }
    return true;
  };

  /* ================================================================= */
  /*                        load capabilities                          */
  /* ================================================================= */
  const loadCaps = async () => {
    if (!hasProvider()) return;
    try {
      const params = [account!, [toHex(chainId!)]] as const;
      const all: Record<string, any> =
        typeof provider.getCapabilities === 'function'
          ? await provider.getCapabilities(account!, [toHex(chainId!)])
          : await provider.request({ method: 'wallet_getCapabilities', params });

      const c = all?.[toHex(chainId!)] ?? null;
      setCaps(c);

      const atomicSupported = Boolean(
        c?.atomic && ['ready', 'supported'].includes(c.atomic.status)
      );

      if (atomicSupported) {
        message.success('Atomic batch supported by your wallet.');
      } else {
        message.error('Atomic batch NOT supported by your wallet.');
      }
    } catch {
      setCaps(null);
      message.error('Failed to load capabilities.');
    }
  };

  useEffect(() => {
    if (!pendingId || !provider) return;
    const poll = setInterval(async () => {
      try {
        const status: any = await provider.request({
          method: 'wallet_getCallsStatus',
          params: [pendingId],
        });
        if (status?.status === 200 && status?.receipts?.length) {
          const txHash = status.receipts[0].transactionHash || status.receipts[0].hash;
          if (txHash) {
            setLastTxHash(txHash);
            setPendingId(null);
            clearInterval(poll);
            message.success('Batch executed on-chain.');
          }
        } else if (status?.status >= 400) {
          message.error('Batch failed.');
          setPendingId(null);
          clearInterval(poll);
        }
      } catch (e) {
        console.error(e);
      }
    }, POLL_INTERVAL);
    return () => clearInterval(poll);
  }, [pendingId, provider]);

  const sendBatch = async (vals: any) => {
    if (!hasProvider()) return;

    setLoading(true);
    setLastTxHash(null);
    setPendingId(null);

    try {
      const calls: { to: string; value: string }[] = [
        {
          to: vals.call1.to,
          value: `0x${parseEther(vals.call1.amount.toString()).toString(16)}`,
        },
      ];

      if (vals.call2?.to) calls.push({ to: vals.call2.to, value: `0x${parseEther(vals.call2.amount.toString()).toString(16)}` });
      if (vals.call3?.to) calls.push({ to: vals.call3.to, value: `0x${parseEther(vals.call3.amount.toString()).toString(16)}` });

      const payload: any = {
        version: '2.0.0',
        chainId: toHex(chainId!),
        from: account!,
        atomicRequired: true,
        calls,
      };
      if (paymaster) {
        payload.capabilities = { paymasterService: { url: undefined } };
      }

      const res: any =
        typeof provider.sendCalls === 'function'
          ? await provider.sendCalls(payload)
          : await provider.request({ method: 'wallet_sendCalls', params: [payload] });

      const hash = typeof res === 'string' ? res : res?.transactionHash || res?.hash;

      if (hash) {
        setLastTxHash(hash);
        message.success('Batch submitted – confirm in wallet.');
      } else if (res?.id) {
        setPendingId(res.id);
        message.info('Batch submitted – waiting for on-chain tx…');
      } else {
        message.warning('wallet_sendCalls returned no hash or id.');
      }
    } catch (err: any) {
      message.error(`wallet_sendCalls failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  /* ================================================================= */
  /*                                  UI                               */
  /* ================================================================= */
  const atomicOK = Boolean(caps?.atomic && ['ready', 'supported'].includes(caps.atomic.status));
  const paymasterOK = Boolean(caps?.paymasterService?.supported);

  if (!mounted) return null;

  return (
    <Card
      style={{
        maxWidth: 840,
        margin: '24px auto',
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,.08)',
      }}
      bodyStyle={{ padding: 24 }}
    >
      <Title level={3} style={{ textAlign: 'center', marginBottom: 16 }}>
        EIP-5792 • Atomic & Sponsored Batch Transfer
      </Title>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* wallet buttons */}
        {!account && (
          <Space wrap justify="center">
            {providers.length ? (
              providers.map(p => (
                <Button
                  key={p.info.uuid}
                  icon={<Avatar src={p.info.icon} icon={<WalletOutlined />} />}
                  onClick={() => connect(p)}
                >
                  {p.info.name}
                </Button>
              ))
            ) : (
              <Tooltip title="Reload or unlock your wallet extension">
                <Button disabled icon={<WalletOutlined />} />
              </Tooltip>
            )}
          </Space>
        )}

        {account && (
          <>
            <Button danger onClick={disconnect} block>
              Disconnect ({account.slice(0, 6)}…{account.slice(-4)})
            </Button>
            <Descriptions size="small" column={1} style={{ marginTop: 4 }}>
              <Descriptions.Item label="Account">{account}</Descriptions.Item>
              <Descriptions.Item label="Chain ID">{chainId}</Descriptions.Item>
            </Descriptions>
          </>
        )}

        <Button onClick={loadCaps} disabled={!account || loading} block>
          Check Wallet Capabilities
        </Button>

        <Divider />

        <Form
          layout="vertical"
          onFinish={sendBatch}
          disabled={loading || !account || !atomicOK}
          initialValues={{
            call1: { amount: 0 },
            call2: { amount: 0 },
            call3: { amount: 0 },
          }}
        >
          <Form.Item label="First call">
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item
                name={['call1', 'to']}
                rules={[{ required: true, message: 'Destination address' }]}
                noStyle
              >
                <Input placeholder="0x…" style={{ width: '70%' }} />
              </Form.Item>
              <Form.Item
                name={['call1', 'amount']}
                rules={[
                  { required: true, message: 'Amount (ETH)' },
                  { type: 'number', min: 0 },
                ]}
                noStyle
              >
                <InputNumber style={{ width: '30%' }} />
              </Form.Item>
            </Space.Compact>
          </Form.Item>

          <Form.Item label="Second call (optional)">
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item name={['call2', 'to']} noStyle>
                <Input placeholder="0x…" style={{ width: '70%' }} />
              </Form.Item>
              <Form.Item name={['call2', 'amount']} noStyle>
                <InputNumber min={0} style={{ width: '30%' }} />
              </Form.Item>
            </Space.Compact>
          </Form.Item>

          <Form.Item label="Third call (optional)">
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item name={['call3', 'to']} noStyle>
                <Input placeholder="0x…" style={{ width: '70%' }} />
              </Form.Item>
              <Form.Item name={['call3', 'amount']} noStyle>
                <InputNumber min={0} style={{ width: '30%' }} />
              </Form.Item>
            </Space.Compact>
          </Form.Item>

          <Form.Item label="Use Paymaster (sponsored gas)" style={{ marginBottom: 0 }}>
            <Switch
              checked={paymaster}
              onChange={setPaymaster}
              disabled={!paymasterOK || loading}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 16 }}>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Send Atomic Batch
            </Button>
          </Form.Item>
        </Form>

        {pendingId && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>Waiting for on-chain confirmation…</Text>
            <Progress percent={undefined} status="active" showInfo={false} />
          </Space>
        )}

        {lastTxHash && (
          <Text>
            Latest tx:{' '}
            <a href={`${explorerBase}/tx/${lastTxHash}`} target="_blank" rel="noopener noreferrer">
              {lastTxHash}
            </a>
          </Text>
        )}
      </Space>
    </Card>
  );
}
