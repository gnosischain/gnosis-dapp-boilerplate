'use client';

import React from 'react';
import Link from 'next/link';
import { Row, Col, Card, Typography } from 'antd';
import {
  WalletOutlined,
  DeploymentUnitOutlined,
  ApiOutlined,
  CodeOutlined,
  CreditCardOutlined,
  UserOutlined,
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function HomePage() {
  const headingFont = 'Poppins, sans-serif';
  const bodyFont = 'Roboto, sans-serif';
  const textColor = '#262626';

  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    border: 'none',
    borderRadius: 12,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
    transition: 'box-shadow 0.25s ease',
  };

  const features = [
    {
      title: 'UX-Friendly Wallet',
      href: '/',
      icon: (
        <WalletOutlined
          style={{ fontSize: '3.5rem', color: '#1677ff' /* blue-6 */ }}
        />
      ),
      description:
        'Connect seamlessly with MetaMask, WalletConnect, and social logins like Google and Farcaster using the native Dynamic SDK.',
    },
    {
      title: 'Token Deployments',
      href: '/deploy-token',
      icon: (
        <DeploymentUnitOutlined
          style={{ fontSize: '3.5rem', color: '#10b981' }}
        />
      ),
      description:
        'Deploy ERC-20 and ERC-721 tokens in one click. The guided UI handles constructor params, gas estimation, and post-deployment details.',
    },
    {
      title: 'Safe APIs and SDK Integration',
      href: '/safe',
      icon: (
        <CreditCardOutlined style={{ fontSize: '3.5rem', color: '#d946ef' }} />
      ),
      description:
        'Safe deployment and interactivity demo using protocol kit and APIs, including examples of using roles and delay modules.',
    },
    {
      title: 'Shutter API Integration',
      href: '/shutter-rps',
      icon: <ApiOutlined style={{ fontSize: '3.5rem', color: '#d946ef' }} />,
      description:
        'Integrate Shutter’s commit-and-reveal threshold-encryption workflows directly from the front-end with minimal boilerplate.',
    },
    {
      title: 'Hardhat 3 Tooling',
      href: '/',
      icon: <CodeOutlined style={{ fontSize: '3.5rem', color: '#f97316' }} />,
      description:
        'A next-gen Hardhat environment featuring blazing-fast Solidity tests, multichain workflows, and a revamped build system.',
    },
    {
      title: 'Circles Profiles',
      href: '/circles',
      icon: <UserOutlined style={{ fontSize: '3.5rem', color: '#47ccb8' }} />,
      description:
        'Learn how to integrate Circles SDK and develop with different Circles Profiles.',
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
      <section style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <Title
          level={1}
          style={{
            fontFamily: headingFont,
            color: '#000',
            fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
            fontWeight: 800,
            marginBottom: '0rem',
          }}
        >
          Gnosis Dapp Boilerplate
        </Title>
      </section>

      <section>
        <Row gutter={[24, 24]} align="stretch">
          {features.map((feat) => (
            <Col key={feat.title} xs={24} sm={12} lg={8} style={{ display: 'flex' }}>
              <Link href={feat.href} style={{ flex: 1, display: 'flex' }}>
                <Card
                  hoverable
                  style={cardStyle}
                  bodyStyle={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)')
                  }
                >
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>{feat.icon}</div>

                  <Title
                    level={4}
                    style={{
                      fontFamily: headingFont,
                      color: textColor,
                      textAlign: 'center',
                      marginBottom: '0.75rem',
                    }}
                  >
                    {feat.title}
                  </Title>

                  <Paragraph
                    style={{
                      color: textColor,
                      lineHeight: 1.6,
                      marginTop: 'auto',
                    }}
                  >
                    {feat.description}
                  </Paragraph>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      </section>
    </div>
  );
}