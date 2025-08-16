import { Actor, HttpAgent } from '@dfinity/agent';
import { DEFAULT_IC_HOST, SIWB_CANISTER_ID } from '../constants/canister';
import { idlFactory as SIWBIdlFactory } from '../canister/ic_siwb_provider.idl';
import {
  SignatureType,
  SIWBActor,
  SIWBGetDelegationResponse,
  SIWBLoginResponse,
  SIWBPrepareLoginResponse,
  SIWBSignMessageType,
} from '../types/siwb';
import { Ed25519KeyIdentity, DelegationIdentity } from '@dfinity/identity';
import { createDelegationChain } from '../utils/auth';

/**
 * Result from the prepare authentication phase
 */
export interface PrepareResult {
  /** Bitcoin address used for authentication */
  address: string;

  /** Message to be signed by the wallet */
  message: string;
}

/**
 * Parameters for completing the login process
 */
export interface LoginParams {
  /** Bitcoin address */
  address: string;

  /** Original message that was signed */
  message: string;

  /** Signed message from wallet */
  signature: string;

  /** Bitcoin public key */
  publicKey: string;

  /** Type of signature used */
  signatureType: SignatureType;

  /** Optional referrer code */
  referrer?: string;
}

/**
 * Phase 1: Prepare authentication and get message to sign
 */
export const prepare = async (address: string): Promise<PrepareResult> => {
  // Create anonymous agent for SIWB canister
  const agent = new HttpAgent({ host: DEFAULT_IC_HOST });

  // Create SIWB actor
  const siwbActor = Actor.createActor(SIWBIdlFactory, {
    agent,
    canisterId: SIWB_CANISTER_ID,
  }) as SIWBActor;

  // Call the SIWB canister's prepare login method
  const response: SIWBPrepareLoginResponse = await siwbActor.siwb_prepare_login(address);

  if ('Err' in response) {
    throw new Error(`SIWB prepare login failed: ${response.Err}`);
  }

  const message = response.Ok;

  return {
    address,
    message,
  };
};

/**
 * Phase 2: Complete authentication with signed message
 */
export const login = async (params: LoginParams): Promise<DelegationIdentity> => {
  // Step 2: Create anonymous agent and SIWB actor
  const agent = new HttpAgent({ host: DEFAULT_IC_HOST });
  const siwbActor = Actor.createActor(SIWBIdlFactory, {
    agent,
    canisterId: SIWB_CANISTER_ID,
  }) as SIWBActor;

  // Step 3: Generate session identity
  const sessionIdentity = Ed25519KeyIdentity.generate();
  const sessionPublicKey = sessionIdentity.getPublicKey().toDer();

  //  Call siwb_login
  const signMessageType: SIWBSignMessageType = { Bip322Simple: null };

  const loginResponse: SIWBLoginResponse = await siwbActor.siwb_login(
    params.signature, // Keep as string (base64)
    params.address, // Keep as string
    params.publicKey, // Keep as string (hex)
    new Uint8Array(sessionPublicKey),
    signMessageType
  );

  if ('Err' in loginResponse) {
    throw new Error(`SIWB login failed: ${loginResponse.Err}`);
  }

  const delegationResponse: SIWBGetDelegationResponse = await siwbActor.siwb_get_delegation(
    params.address,
    new Uint8Array(sessionPublicKey),
    loginResponse.Ok.expiration
  );

  if ('Err' in delegationResponse) {
    throw new Error(`SIWB get delegation failed: ${delegationResponse.Err}`);
  }

  // Step 6: Create delegation chain
  const delegationChain = createDelegationChain(
    delegationResponse.Ok,
    loginResponse.Ok.user_canister_pubkey
  );

  // Step 7: Create delegation identity
  const identity = DelegationIdentity.fromDelegation(sessionIdentity, delegationChain);

  return identity;
};
