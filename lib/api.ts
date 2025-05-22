export interface ShutterApiMessageData {
  eon: number;
  identity: string;
  identity_prefix: string;
  eon_key: string;
  tx_hash: string;
}

export interface ShutterApiResponse {
  message: ShutterApiMessageData;
  error?: string;
}

export interface ShutterDecryptionKeyData {
  decryption_key: string;
  identity: string;
  decryption_timestamp: number;
}

export interface ShutterDecryptionKeyResponse {
  message: ShutterDecryptionKeyData;
  error?: string;
}

export const DECRYPTION_DELAY = 30; // seconds

/** Registers an identity with Shutter and returns the message payload. */
export async function fetchShutterData(
  decryptionTimestamp: number,
): Promise<ShutterApiMessageData> {
  console.log(
    `Sending request to Shutter API with decryption timestamp: ${decryptionTimestamp}`,
  );

  const res = await fetch(
    'https://shutter-api.shutter.network/api/register_identity',
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ decryptionTimestamp }),
    },
  );

  const txt = await res.text();

  if (!res.ok) {
    throw new Error(`Shutter API error ${res.status}: ${txt}`);
  }

  let json: ShutterApiResponse;
  try {
    json = JSON.parse(txt);
  } catch {
    throw new Error(`Shutter API response was not JSON: ${txt}`);
  }

  if (!json.message) {
    throw new Error(`Shutter API response missing message field: ${txt}`);
  }

  return json.message;
}

/** Fetches the decryption key for a previously-registered identity. */
export async function fetchDecryptionKey(
  identity: string,
): Promise<ShutterDecryptionKeyData> {
  console.log(`Fetching decryption key for identity ${identity}`);

  const res = await fetch(
    `https://shutter-api.shutter.network/api/get_decryption_key?identity=${identity}`,
  );

  const txt = await res.text();

  let json: ShutterDecryptionKeyResponse;
  try {
    json = JSON.parse(txt);
  } catch {
    throw new Error(`Shutter API response was not JSON: ${txt}`);
  }

  // Handle “too early” gracefully
  if (!res.ok) {
    if (json?.error && json.error.includes('timestamp not reached yet')) {
      throw new Error(
        `Cannot decrypt yet: wait ≈${DECRYPTION_DELAY}s after encryption.\nDetails: ${json.error}`,
      );
    }
    throw new Error(`Shutter API error ${res.status}: ${txt}`);
  }

  if (!json.message) {
    throw new Error(`Shutter API response missing message field: ${txt}`);
  }

  return json.message;
}

////////////////////   ───── Safe Transaction Service helpers ─────   /////////////

/** Shape returned by /owners/{address}/safes/ */
export interface SafeListResponse {
  safes: string[];
}

/**
 * Returns every Safe address where `ownerAddress` is an owner on **Gnosis Chain mainnet**.
 * @throws if the HTTP request fails or the payload is malformed.
 */
export async function fetchSafesByOwner(ownerAddress: string): Promise<string[]> {
  if (!ownerAddress) {
    throw new Error('ownerAddress is empty');
  }

  const url = `https://safe-transaction-gnosis-chain.safe.global/api/v1/owners/${ownerAddress}/safes/`;

  const res = await fetch(url, { headers: { accept: 'application/json' } });
  const txt = await res.text();

  if (!res.ok) {
    throw new Error(`Safe Tx Service error ${res.status}: ${txt}`);
  }

  let json: SafeListResponse;
  try {
    json = JSON.parse(txt);
  } catch {
    throw new Error(`Safe Tx Service response was not JSON: ${txt}`);
  }

  if (!Array.isArray(json.safes)) {
    throw new Error(`Safe Tx Service payload malformed: ${txt}`);
  }

  return json.safes;
}
