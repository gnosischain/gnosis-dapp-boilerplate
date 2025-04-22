'use client';

import React from 'react';
import { Row, Col, Card, Typography } from 'antd';
import {
  WalletOutlined,
  DeploymentUnitOutlined,
  ApiOutlined,
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function HomePage() {
  const headingFont = 'Poppins, sans-serif';
  const bodyFont = 'Roboto, sans-serif';
  const textColor = '#262626';

  const cardStyle = {
    background: '#ffffff',
    border: 'none',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  };

  const features = [
    {
      title: 'UX‑Friendly Wallet',
      icon: <WalletOutlined style={{ fontSize: '4rem', color: '#1890ff' }} />,  
      description:
        'Connect seamlessly with MetaMask, WalletConnect, and social logins like Google and Farcaster for a truly frictionless onboarding experience.',
    },
    {
      title: 'Token Deployments',
      icon: <DeploymentUnitOutlined style={{ fontSize: '4rem', color: '#1890ff' }} />,  
      description:
        'Easily deploy your own ERC‑20 and ERC‑721 tokens in one click, with a guided UI that handles constructor parameters and gas estimation for you.',
    },
    {
      title: 'Shutter API Integration',
      icon: <ApiOutlined style={{ fontSize: '4rem', color: '#1890ff' }} />,  
      description:
        'Integrate Shutter’s commit‑and‑reveal threshold‑encryption workflows via our API—secure, decentralized, and tamper‑proof document your commitments with confidence.',
    },
  ];

  return (
    <div
      style={{
        padding: '4rem 1rem',
        maxWidth: 1200,
        margin: '0 auto',
        fontFamily: bodyFont,
      }}
    >
      {/* Hero Section */}
      <section style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <Title
          level={1}
          style={{
            fontFamily: headingFont,
            color: '#000000',
            fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
            fontWeight: 800,
          }}
        >
          Gnosis Dapp Boilerplate
        </Title>
        <Paragraph
          style={{
            fontFamily: bodyFont,
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            color: textColor,
            maxWidth: 700,
            margin: '0 auto 2rem',
            lineHeight: 1.6,
          }}
        >
          A multi-faceted boilerplate that offers seamless wallet integration, one‑click token deployment, Shutter network API integration and much more to accelerate your Gnosis‑powered dApp development.
        </Paragraph>
      </section>

      {/* Features Grid */}
      <section>
        <Row gutter={[24, 24]}>
          {features.map((feat) => (
            <Col key={feat.title} xs={24} sm={12} lg={8}>
              <Card hoverable style={cardStyle} styles={{ body: { padding: '1.5rem' } }}>
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  {feat.icon}
                </div>
                <Title
                  level={4}
                  style={{
                    fontFamily: headingFont,
                    color: textColor,
                    textAlign: 'center',
                  }}
                >
                  {feat.title}
                </Title>
                <Paragraph style={{ color: textColor, lineHeight: 1.5 }}>
                  {feat.description}
                </Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </section>
    </div>
  );
}
