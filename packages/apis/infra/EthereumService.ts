import { getProofMeABI } from "./abi.js";

export class EthereumService {
  private contract: any;
  private web3Provider: any;
  public readonly ethereumContractAddress: string;

  constructor(web3Provider: any) {
    this.web3Provider = web3Provider;
    this.ethereumContractAddress = "0x0CFf644D57ceD82b2D44B42e5ac1bAbb440C85A6";
    this.contract = new this.web3Provider.eth.Contract(
      getProofMeABI(),
      this.ethereumContractAddress
    );
  }


  // Credential Type Management (for issuers)
  async createCredentialWithSubdomain(
    credentialType: string,
    subdomain: string,
    description: string,
    fromAddress: string
  ): Promise<string> {
    const result = await this.contract.methods
      .createCredentialWithSubdomain(credentialType, subdomain, description)
      .send({ from: fromAddress });
    return result.transactionHash;
  }

  async credentialExists(credentialType: string): Promise<boolean> {
    return await this.contract.methods.credentialExists(credentialType).call();
  }

  async getCredentialTypeBySubdomain(subdomain: string): Promise<string> {
    return await this.contract.methods
      .getCredentialTypeBySubdomain(subdomain)
      .call();
  }

  // Claim Management
  async issueClaim(
    did: string,
    cid: string,
    credentialType: string,
    signature: string,
    fromAddress: string
  ): Promise<string> {
    const result = await this.contract.methods
      .issueClaim(did, cid, credentialType, signature)
      .send({ from: fromAddress });
    return result.transactionHash;
  }

  async getClaim(did: string, credentialType: string): Promise<string> {
    return await this.contract.methods.getClaim(did, credentialType).call();
  }

  // Utility functions
  async getAccounts(): Promise<string[]> {
    return await this.web3Provider.eth.getAccounts();
  }

  async signMessage(message: string, address: string): Promise<string> {
    return await this.web3Provider.eth.personal.sign(message, address);
  }

  // Generate message hashes for signing
  generateRegistrationMessage(did: string): string {
    return this.web3Provider.utils.soliditySha3(
      { type: "string", value: "Register" },
      { type: "string", value: did },
      { type: "address", value: this.ethereumContractAddress }
    );
  }

  generateClaimMessage(
    did: string,
    cid: string,
    credentialType: string
  ): string {
    return this.web3Provider.utils.soliditySha3(
      { type: "string", value: "IssueClaim" },
      { type: "string", value: did },
      { type: "string", value: cid },
      { type: "string", value: credentialType },
      { type: "address", value: this.ethereumContractAddress }
    );
  }
}
