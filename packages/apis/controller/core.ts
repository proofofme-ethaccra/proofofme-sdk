import {
  type DIDRegistryConfig,
  type KeyPair,
  type FilecoinConfig,
} from "../domain/types.js";
import { type ClaimDocument } from "../domain/did.js";
import { EthereumService } from "../infra/EthereumService.js";
import { FilecoinStorage } from "../infra/FilecoinStorageService.js";
import { KeyService } from "../infra/KeyService.js";
import {
  VerifyClaimService,
  CredentialTypeService,
  IssueClaimService,
} from "./services.js";
import { type JWK } from "jose";

export default class CoreAPI {
  private keyPair: KeyPair | null = null;

  private ethereumService: EthereumService;
  private filecoinStorage: FilecoinStorage;

  private issueClaimService: IssueClaimService;
  private verifyClaimService: VerifyClaimService;

  private credentialTypeService: CredentialTypeService;

  constructor(didConfig: DIDRegistryConfig, fsConfig: FilecoinConfig) {
    this.ethereumService = new EthereumService(didConfig.web3Provider);
    this.filecoinStorage = new FilecoinStorage(fsConfig);

    this.issueClaimService = new IssueClaimService(
      this.ethereumService,
      this.filecoinStorage
    );
    this.verifyClaimService = new VerifyClaimService(
      this.ethereumService,
      this.filecoinStorage
    );
    this.credentialTypeService = new CredentialTypeService(
      this.ethereumService
    );
  }

  async initialize() {
    if (!this.keyPair) {
      this.keyPair = await KeyService.makeRecipientKeypair();
    }
    await this.filecoinStorage.initialize();
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.keyPair) {
      await this.initialize();
    }
  }

  /**
   * Create a credential type with subdomain (only issuers can do this)
   */
  async createCredentialType(
    credentialType: string,
    subdomain: string,
    description: string,
    issuerAddress: string
  ): Promise<void> {
    return this.credentialTypeService.create(
      credentialType,
      subdomain,
      description,
      issuerAddress
    );
  }

  /**
   * Issue a claim to a user (only the credential issuer can do this)
   */
  async issueClaim(
    userAddress: string,
    credentialType: string,
    claimData: ClaimDocument,
    issuerAddress: string
  ): Promise<string> {
    await this.ensureInitialized();
    return this.issueClaimService.execute(
      userAddress,
      credentialType,
      claimData,
      this.keyPair!,
      issuerAddress
    );
  }

  /**
   * Bulk issue multiple claims to a user
   */
  async bulkIssueClaims(
    userAddress: string,
    claims: Array<{ credentialType: string; data: ClaimDocument }>,
    issuerAddress: string
  ): Promise<string[]> {
    await this.ensureInitialized();
    const results = await Promise.allSettled(
      claims.map(({ credentialType, data }) =>
        this.issueClaim(userAddress, credentialType, data, issuerAddress)
      )
    );

    const cids: string[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        cids.push(result.value);
      } else {
        errors.push(
          `Claim ${index} (${claims[index]!.credentialType}): ${result.reason}`
        );
      }
    });

    if (errors.length > 0) {
      console.warn(`⚠️ Some claims failed:`, errors);
    }

    console.log(
      `🚀 Bulk issued ${cids.length}/${claims.length} claims successfully`
    );
    return cids;
  }

  /**
   * Verify a claim for a user
   */
  async verifyClaim(
    userAddress: string,
    credentialType: string
  ): Promise<ClaimDocument> {
    await this.ensureInitialized();
    const did = `did:proofofme:${userAddress}`;
    return this.verifyClaimService.execute(did, credentialType, this.keyPair!);
  }

  /**
   * Check if a credential type exists
   */
  async checkCredentialExists(credentialType: string): Promise<boolean> {
    return this.credentialTypeService.exists(credentialType);
  }

  /**
   * Get credential type by subdomain
   */
  async getCredentialTypeBySubdomain(subdomain: string): Promise<string> {
    return this.credentialTypeService.getCredentialTypeBySubdomain(subdomain);
  }

  /**
   * Check if subdomain is available for credential creation
   */
  async isSubdomainAvailable(subdomain: string): Promise<boolean> {
    try {
      const credentialType = await this.getCredentialTypeBySubdomain(subdomain);
      return credentialType.length === 0;
    } catch (error) {
      return true; // Available if error
    }
  }

  /**
   * Get user's claim for a specific credential type
   */
  async getUserClaim(
    userAddress: string,
    credentialType: string
  ): Promise<string> {
    const did = `did:proofofme:${userAddress}`;
    return this.ethereumService.getClaim(did, credentialType);
  }

  /**
   * Export public key for encryption
   */
  async exportPublicKey(): Promise<JWK | null> {
    return this.keyPair?.pubJwk || null;
  }

  /**
   * Set custom key pair
   */
  async setKeyPair(pubJwk: JWK, privJwk: JWK): Promise<void> {
    await KeyService.importRecipientPublicKey(pubJwk);
    await KeyService.importRecipientPrivateKey(privJwk);
    this.keyPair = { pubJwk, privJwk };
  }

  /**
   * Get connected wallet accounts
   */
  async getAccounts(): Promise<string[]> {
    return this.ethereumService.getAccounts();
  }
}
