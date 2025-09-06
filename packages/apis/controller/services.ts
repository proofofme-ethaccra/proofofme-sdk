import { type ClaimDocument } from "../domain/did.js";
import { type KeyPair } from "../domain/types.js";
import { EncryptionService } from "../infra/EncryptionService.js";
import { EthereumService } from "../infra/EthereumService.js";
import { FilecoinStorage } from "../infra/FilecoinStorageService.js";

export class VerifyClaimService {
  constructor(
    private readonly ethereumService: EthereumService,
    private readonly filecoinStorage: FilecoinStorage
  ) {}

  async execute(
    did: string,
    credentialType: string,
    keyPair: KeyPair
  ): Promise<ClaimDocument> {
    // 1. Get claim identifier (CID) from contract
    const cid = await this.ethereumService.getClaim(did, credentialType);

    if (!cid) {
      throw new Error(
        `No claim found for ${did} with credential type ${credentialType}`
      );
    }
    console.log(`🔍 Found claim identifier: ${cid}`);

    // 2. Retrieve from Filecoin Storage
    const encrypted = await this.filecoinStorage.retrieve(cid);

    // 3. Decrypt and return
    const claimData = await EncryptionService.decrypt(
      encrypted,
      keyPair.privJwk
    );

    console.log(`✅ Claim verified and decrypted for ${did}`);
    return claimData;
  }
}

export class RegistrationService {
  constructor(private readonly ethereumService: EthereumService) {}

  async registerDID(userAddress: string): Promise<void> {
    // Generate DID based on address
    const did = `did:proofofme:${userAddress}`;

    // Generate registration message hash
    const messageHash = this.ethereumService.generateRegistrationMessage(did);

    // Sign the message
    const signature = await this.ethereumService.signMessage(
      messageHash,
      userAddress
    );

    // Register DID
    await this.ethereumService.registerDID(did, userAddress, signature);
    console.log(`✅ DID registered for address ${userAddress}`);
  }

  async isDIDRegistered(userAddress: string): Promise<boolean> {
    const did = `did:proofofme:${userAddress}`;
    return await this.ethereumService.isDIDRegistered(did);
  }
}

export class IssueClaimService {
  constructor(
    private readonly ethereumService: EthereumService,
    private readonly filecoinStorage: FilecoinStorage
  ) {}

  async execute(
    userAddress: string,
    credentialType: string,
    claimData: ClaimDocument,
    keyPair: KeyPair,
    issuerAddress: string
  ): Promise<string> {
    const did = `did:proofofme:${userAddress}`;

    // 1. Check if DID is registered
    const isRegistered = await this.ethereumService.isDIDRegistered(did);
    if (!isRegistered) {
      throw new Error(`DID not registered for address ${userAddress}`);
    }

    // 2. Check if credential type exists
    const credentialExists = await this.ethereumService.credentialExists(
      credentialType
    );
    if (!credentialExists) {
      throw new Error(`Credential type ${credentialType} does not exist`);
    }

    // 3. Encrypt the claim data
    const encrypted = await EncryptionService.encrypt(
      claimData,
      keyPair.pubJwk
    );

    // 4. Upload to Filecoin Storage
    const cid = await this.filecoinStorage.store(encrypted);
    console.log(`📦 Claim stored on Filecoin: ${cid}`);

    // 5. Generate signature for the claim (user must sign to authorize)
    const messageHash = this.ethereumService.generateClaimMessage(
      did,
      cid.commp,
      credentialType
    );
    const userSignature = await this.ethereumService.signMessage(
      messageHash,
      userAddress
    );

    // 6. Issue claim (only issuer can call this)
    await this.ethereumService.issueClaim(
      did,
      cid.commp,
      credentialType,
      userSignature,
      issuerAddress
    );

    console.log(
      `🎉 Claim issued successfully for ${userAddress} (${credentialType})`
    );
    return cid.commp;
  }
}

export class CredentialTypeService {
  constructor(private readonly ethereumService: EthereumService) {}

  async create(
    credentialType: string,
    subdomain: string,
    description: string,
    issuerAddress: string
  ): Promise<void> {
    await this.ethereumService.createCredentialWithSubdomain(
      credentialType,
      subdomain,
      description,
      issuerAddress
    );
    console.log(
      `✅ Credential type '${credentialType}' created with subdomain '${subdomain}'`
    );
  }

  async exists(credentialType: string): Promise<boolean> {
    return this.ethereumService.credentialExists(credentialType);
  }

  async getCredentialTypeBySubdomain(subdomain: string): Promise<string> {
    return this.ethereumService.getCredentialTypeBySubdomain(subdomain);
  }
}

// Example usage service that demonstrates the flow
export class ProofOfMeWorkflowService {
  constructor(
    private readonly registrationService: RegistrationService,
    private readonly credentialTypeService: CredentialTypeService,
    private readonly issueClaimService: IssueClaimService,
    private readonly verifyClaimService: VerifyClaimService
  ) {}

  // Complete workflow for setting up an issuer
  async setupIssuer(
    issuerAddress: string,
    credentialType: string,
    subdomain: string,
    description: string
  ): Promise<void> {
    console.log(`🏗️ Setting up issuer ${issuerAddress}...`);

    // 1. Register issuer's DID
    const isRegistered = await this.registrationService.isDIDRegistered(
      issuerAddress
    );
    if (!isRegistered) {
      await this.registrationService.registerDID(issuerAddress);
    }

    // 2. Create credential type with subdomain
    const credentialExists = await this.credentialTypeService.exists(
      credentialType
    );
    if (!credentialExists) {
      await this.credentialTypeService.create(
        credentialType,
        subdomain,
        description,
        issuerAddress
      );
    }

    console.log(`✅ Issuer setup complete!`);
  }

  // Complete workflow for issuing a claim to a user
  async issueClaimToUser(
    userAddress: string,
    credentialType: string,
    claimData: ClaimDocument,
    keyPair: KeyPair,
    issuerAddress: string
  ): Promise<string> {
    console.log(`📝 Issuing claim to user ${userAddress}...`);

    // 1. Ensure user has a DID
    const isUserRegistered = await this.registrationService.isDIDRegistered(
      userAddress
    );
    if (!isUserRegistered) {
      await this.registrationService.registerDID(userAddress);
    }

    // 2. Issue the claim
    const cid = await this.issueClaimService.execute(
      userAddress,
      credentialType,
      claimData,
      keyPair,
      issuerAddress
    );

    console.log(`✅ Claim issued successfully!`);
    return cid;
  }

  // Complete workflow for verifying a claim
  async verifyUserClaim(
    userAddress: string,
    credentialType: string,
    keyPair: KeyPair
  ): Promise<ClaimDocument> {
    console.log(`🔍 Verifying claim for user ${userAddress}...`);

    const did = `did:proofofme:${userAddress}`;
    const claimData = await this.verifyClaimService.execute(
      did,
      credentialType,
      keyPair
    );

    console.log(`✅ Claim verified successfully!`);
    return claimData;
  }
}
