'use client';

import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Form,
  Input,
  InputNumber,
  Button,
  message,
  Card,
} from 'antd';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { getSigner } from '@dynamic-labs/ethers-v6';
import { isEthereumWallet } from '@dynamic-labs/ethereum';
import { Contract, parseUnits } from 'ethers';
import Image from 'next/image';

const { TabPane } = Tabs;

/* ------------------------------------------------------------------ */
/*  Pre‑deployed contract addresses & minimal ABIs                    */
/* ------------------------------------------------------------------ */

const ERC20_ADDRESS =
  (process.env.NEXT_PUBLIC_ERC20_ADDRESS as `0x${string}` | undefined) ?? '';
const ERC721_ADDRESS =
  (process.env.NEXT_PUBLIC_ERC721_ADDRESS as `0x${string}` | undefined) ?? '';

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function mint(uint256 amount)',
];

const ERC721_ABI = ['function safeMint(string uri) returns (uint256)'];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function TokenDeploymentComponent() {
  const { primaryWallet } = useDynamicContext();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  /* ---------- helpers ---------- */
  const signerOrFail = async () => {
    if (!primaryWallet || !isEthereumWallet(primaryWallet)) {
      message.error('Please connect an Ethereum wallet.');
      return null;
    }
    return getSigner(primaryWallet);
  };

  /* ---------- deployment handlers (unchanged fields) ---------- */
  const deployERC20 = async (values: any) => {
    const signer = await signerOrFail();
    if (!signer) return;

    setLoading(true);
    try {
      // ↳ plug in factory deployment or CREATE2 logic here
      console.log('Deploying ERC20 with values:', values);
      message.success('ERC20 Token deployed (stub).');
    } catch (err: any) {
      message.error(`Failed to deploy ERC20 token: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deployERC721 = async (values: any) => {
    const signer = await signerOrFail();
    if (!signer) return;

    setLoading(true);
    try {
      console.log('Deploying ERC721 with values:', values);
      message.success('ERC721 Token deployed (stub).');
    } catch (err: any) {
      message.error(`Failed to deploy ERC721 token: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- permission‑less mint handlers ---------- */
  const mintERC20 = async (v: { amount: number }) => {
    const signer = await signerOrFail();
    if (!signer) return;
    if (!ERC20_ADDRESS) {
      message.error('ERC20 address not set.');
      return;
    }

    setLoading(true);
    try {
      const erc20 = new Contract(ERC20_ADDRESS, ERC20_ABI, signer);
      const dec: number = await erc20.decimals();
      const units = parseUnits(v.amount.toString(), dec);
      const tx = await erc20.mint(units);
      await tx.wait();
      message.success(`Minted ${v.amount} tokens to your wallet`);
    } catch (err: any) {
      message.error(`ERC20 mint failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const mintERC721 = async (v: { uri: string }) => {
    const signer = await signerOrFail();
    if (!signer) return;
    if (!ERC721_ADDRESS) {
      message.error('ERC721 address not set.');
      return;
    }

    setLoading(true);
    try {
      const erc721 = new Contract(ERC721_ADDRESS, ERC721_ABI, signer);
      const tx = await erc721.safeMint(v.uri);
      await tx.wait();
      message.success('NFT minted to your wallet');
    } catch (err: any) {
      message.error(`ERC721 mint failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------- UI ------------------ */
  return (
    <Card
      style={{
        maxWidth: 800,
        margin: '20px auto',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        minHeight: 250,
      }}
    >
      <h1 style={{ textAlign: 'center', marginBottom: 20 }}>
        Deploy On‑chain or Mint Your Own!
      </h1>

      <div style={{ display: 'flex' }}>
        {/* illustration */}
        <div
          style={{
            width: 250,
            height: 250,
            borderRight: '1px solid #ccc',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <Image
            src="/images/token-deploy.jpeg"
            alt="Token Deployment"
            fill
            sizes="250px"
            style={{ objectFit: 'cover' }}
            priority
          />
        </div>

        {/* tabs */}
        <div style={{ flex: 1, padding: 20 }}>
          <Tabs defaultActiveKey="erc20">
            {/* ───────── DEPLOY ───────── */}
            <TabPane tab="ERC20" key="erc20">
              <Form layout="vertical" onFinish={deployERC20}>
                <Form.Item label="Token Name" name="name" rules={[{ required: true }]}>
                  <Input placeholder="MyToken" />
                </Form.Item>
                <Form.Item label="Symbol" name="symbol" rules={[{ required: true }]}>
                  <Input placeholder="MTK" />
                </Form.Item>
                <Form.Item label="Total Supply" name="totalSupply" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item label="Decimals" name="decimals" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" block loading={loading}>
                    Deploy ERC20
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>

            <TabPane tab="ERC721" key="erc721">
              <Form layout="vertical" onFinish={deployERC721}>
                <Form.Item label="Token Name" name="name" rules={[{ required: true }]}>
                  <Input placeholder="MyNFT" />
                </Form.Item>
                <Form.Item label="Symbol" name="symbol" rules={[{ required: true }]}>
                  <Input placeholder="MNFT" />
                </Form.Item>
                <Form.Item label="Base URI" name="baseURI" rules={[{ required: true }]}>
                  <Input placeholder="https://example.com/metadata/" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" block loading={loading}>
                    Deploy ERC721
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>

            {/* ───────── MINT (extra tabs, existing fields unchanged) ───────── */}
            <TabPane tab="Mint ERC20" key="erc20Mint">
              <Form layout="vertical" onFinish={mintERC20}>
                <Form.Item label="Amount (whole tokens)" name="amount" rules={[{ required: true }]}>
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" block loading={loading}>
                    Mint ERC20 to My Wallet
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>

            <TabPane tab="Mint ERC721" key="erc721Mint">
              <Form layout="vertical" onFinish={mintERC721}>
                <Form.Item label="Token URI" name="uri" rules={[{ required: true }]}>
                  <Input placeholder="ipfs://… or https://…" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" block loading={loading}>
                    Mint NFT to My Wallet
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>
          </Tabs>
        </div>
      </div>
    </Card>
  );
}
