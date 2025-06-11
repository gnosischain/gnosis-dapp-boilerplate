# Setting up Zodiac Roles with an Already Deployed Safe using the SDK

I'll provide a step-by-step guide on how to set up the Zodiac Roles module with an already deployed Safe using the Zodiac Roles SDK.

## 1. Installation

First, install the necessary packages:

```bash
# With npm
npm i --save @gnosis-guild/eth-sdk @gnosis-guild/eth-sdk-client zodiac-roles-sdk

# With yarn
yarn add @gnosis-guild/eth-sdk @gnosis-guild/eth-sdk-client zodiac-roles-sdk

# With pnpm
pnpm add @gnosis-guild/eth-sdk @gnosis-guild/eth-sdk-client zodiac-roles-sdk
``` [1](#1-0) 

## 2. Configuration

Create a folder called `eth-sdk` in your project root and add a `config.ts` file that lists all the contracts you want to permit calling:

```typescript
import { defineConfig } from "@gnosis-guild/eth-sdk";

export default defineConfig({
  contracts: {
    mainnet: {
      // List your contracts here
      dai: "0x6b175474e89094c44da98b954eedeac495271d0f",
      // Add more contracts as needed
    },
  },
});
``` [2](#1-1) 

Run the generator to fetch contract ABIs:

```bash
yarn eth-sdk
``` [3](#1-2) 

## 3. Setting up Roles with an Existing Safe

Now, we'll create a script to set up the Roles module with your already deployed Safe. The key function for this is `setUpRolesMod`:

```typescript
import { setUpRolesMod } from "zodiac-roles-sdk";
import { ethers } from "ethers";

// Your Safe address
const SAFE_ADDRESS = "0xYourSafeAddress";

// Define your roles configuration
const roles = [
  {
    key: "admin", // A human-readable identifier
    members: ["0xMemberAddress1", "0xMemberAddress2"], // Addresses that will have this role
    permissions: [
      // Define permissions using the allow kit (see next step)
    ],
  },
];

// Generate transactions to set up Roles module
const transactions = setUpRolesMod({
  avatar: SAFE_ADDRESS, // Your Safe address
  target: SAFE_ADDRESS, // Usually the same as avatar
  owner: SAFE_ADDRESS, // Usually the same as avatar
  roles: roles,
  enableOnTarget: true, // Will automatically enable the module on your Safe
});

// These transactions need to be executed by the Safe
console.log(transactions);
``` [4](#1-3) 

## 4. Define Permissions

You need to define what your roles can do. Use the allow kit to grant permissions to specific contract functions:

```typescript
import { allow } from "zodiac-roles-sdk/kit";

// Example: Allow role to approve DAI transfers to a specific contract
const CURVE_3POOL = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";
const permissions = [allow.mainnet.dai.approve(CURVE_3POOL)];

// Add these permissions to your roles array in the previous step
``` [5](#1-4) 

## 5. Submit Transactions to Your Safe

The `setUpRolesMod` function returns an array of transaction objects that need to be executed by your Safe. You can:

1. **Submit them individually**:
```typescript
// Using ethers.js
const safeContract = new ethers.Contract(SAFE_ADDRESS, SAFE_ABI, signer);

// For each transaction in the array
for (const tx of transactions) {
  // Create a Safe transaction
  await safeContract.execTransaction(
    tx.to,
    tx.value,
    tx.data,
    0, // operation
    0, // safeTxGas
    0, // baseGas
    0, // gasPrice
    ethers.constants.AddressZero, // gasToken
    ethers.constants.AddressZero, // refundReceiver
    "0x" // signatures (depend on your Safe's setup)
  );
}
```

2. **Or batch them using multi-send**:
```typescript
import { encodeMulti } from "ethers-multisend";

const multiSendTx = encodeMulti(
  transactions.map((tx) => ({ to: tx.to, value: tx.value, data: tx.data }))
);

// Submit this as a single transaction to your Safe
``` [6](#1-5) 

## Complete End-to-End Example

Here's a complete example that puts everything together:

```typescript
import { ethers } from "ethers";
import { setUpRolesMod } from "zodiac-roles-sdk";
import { allow } from "zodiac-roles-sdk/kit";
import Safe from "@safe-global/safe-core-sdk";
import SafeServiceClient from "@safe-global/safe-service-client";

// Connect to provider
const provider = new ethers.providers.JsonRpcProvider("YOUR_RPC_URL");
const signer = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);

// Your deployed Safe address
const SAFE_ADDRESS = "0xYourSafeAddress";

// Target contract addresses
const DAI_ADDRESS = "0x6b175474e89094c44da98b954eedeac495271d0f";
const SPENDER_ADDRESS = "0xSomeSpenderAddress";

// Define roles and permissions
const roles = [
  {
    key: "treasury-manager",
    members: ["0xMemberAddress1", "0xMemberAddress2"],
    permissions: [
      allow.mainnet.dai.approve(SPENDER_ADDRESS),
      allow.mainnet.dai.transfer(null), // Allow transfers to any address
    ],
  },
];

// Generate setup transactions
const transactions = setUpRolesMod({
  avatar: SAFE_ADDRESS,
  target: SAFE_ADDRESS,
  owner: SAFE_ADDRESS,
  roles: roles,
});

// Use Safe SDK to propose these transactions
async function proposeToSafe() {
  const safeSdk = await Safe.create({
    ethAdapter: yourEthAdapter, // Create your ethAdapter
    safeAddress: SAFE_ADDRESS,
  });
  
  const safeService = new SafeServiceClient({
    txServiceUrl: 'https://safe-transaction.mainnet.gnosis.io',
    ethAdapter: yourEthAdapter,
  });
  
  // Create and propose transaction
  for (const tx of transactions) {
    const safeTransaction = await safeSdk.createTransaction({
      to: tx.to,
      data: tx.data,
      value: tx.value,
      operation: 0, // Call
    });
    
    const safeTxHash = await safeSdk.getTransactionHash(safeTransaction);
    const signature = await safeSdk.signTransactionHash(safeTxHash);
    
    await safeService.proposeTransaction({
      safeAddress: SAFE_ADDRESS,
      safeTransactionData: safeTransaction.data,
      safeTxHash,
      senderAddress: await signer.getAddress(),
      senderSignature: signature.data,
    });
  }
}

proposeToSafe();
```

## Notes

1. The Zodiac Roles Modifier is deployed across multiple chains. You can find the deployment addresses in the README. [7](#1-6) 

2. For a more streamlined approach, check out the Permissions Starter Kit mentioned in the documentation: [8](#1-7) 

3. The setup process creates a new Roles modifier instance that is connected to your existing Safe, without requiring any changes to the Safe itself beyond enabling the module.

4. Once set up, users with roles can execute transactions through the Roles modifier according to their assigned permissions, without needing to go through the full Safe signing process.

Notes:
- This guide assumes basic familiarity with the Safe ecosystem and ethers.js.
- You'll need your own RPC endpoints and appropriate signing keys with access to your Safe.
- Always test on testnets before applying to production Safes.
